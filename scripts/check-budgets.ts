/**
 * scripts/check-budgets.ts — Performance budget enforcer + registration linter.
 *
 * Reads `perf-budget.json` (the contract) and the built `assets/` directory,
 * then verifies three things:
 *   1. Per-file gzipped size caps for *.js and *.css.
 *   2. Per-route gzipped size caps, computed from the static script/stylesheet
 *      graph rooted at `layout/theme.liquid` + the route's `templates/<name>.json`.
 *   3. Custom-element registration linter: every custom-element tag emitted in a
 *      route's render graph has its registering script reachable in that route's
 *      asset set (either globally or section-owned). Closes the silent-failure
 *      gap from the section-owned defer-load pattern (ADR-0003 pillar 7).
 *
 * Defer-load detection: this script only counts assets referenced by static
 * `<script src="{{ '<name>' | asset_url }}">` (or `<link href=...>`) tags in
 * `.liquid` files. Modules reached only via dynamic `import('@theme/...')` from
 * other JS modules are NOT counted toward the route's initial-paint budget.
 *
 * Exits 0 on success, 1 on any over-budget asset, route, or registration gap.
 *
 * Run: `npx tsx scripts/check-budgets.ts` (after `npm run build`).
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { gzipSync } from "node:zlib";

// ---------- types ----------

type FileKind = "js" | "css";

interface PerfBudget {
  perFile: Record<FileKind, { maxBytesGzipped: number }> & {
    /**
     * Filenames excluded from the per-file cap. Use sparingly: only for
     * vendored bundles that are intentionally lazy-loaded via dynamic
     * `import()` and therefore never appear in any route's static graph
     * (and so would not affect initial-paint performance).
     */
    exclude?: string[];
  };
  perRoute: Record<string, { template: string; maxBytesGzipped: number }>;
  lighthouse: unknown; // unused by this script (LHCI is iteration 2)
}

interface AssetSize {
  name: string; // e.g. "product-form.js"
  bytes: number; // raw size on disk
  gzippedBytes: number; // gzipped size (decimal)
  kind: FileKind;
}

interface RouteFailure {
  route: string;
  budget: number;
  actual: number;
  delta: number;
  assets: AssetSize[];
}

/** Custom-element registration found in a route's render graph but missing its script. */
interface RegistrationGap {
  route: string;
  liquidFile: string; // relative path
  element: string; // tag name, e.g. "product-form-component"
  script: string; // expected asset, e.g. "product-form.js"
}

// ---------- paths ----------

const ROOT = process.cwd();
const BUDGET_PATH = join(ROOT, "perf-budget.json");
const ASSETS_DIR = join(ROOT, "assets");
const LAYOUT_PATH = join(ROOT, "layout", "theme.liquid");
const SECTIONS_DIR = join(ROOT, "sections");
const SNIPPETS_DIR = join(ROOT, "snippets");
const BLOCKS_DIR = join(ROOT, "blocks");
const TEMPLATES_DIR = join(ROOT, "templates");
const SRC_SCRIPTS_DIR = join(ROOT, "src", "scripts");

// ---------- I/O helpers ----------

function readJSON<T>(path: string): T {
  // Shopify CLI prepends a `/* ... */` banner to templates/*.json on sync.
  // Strip a single leading block comment before parsing.
  const raw = readFileSync(path, "utf8").replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
  return JSON.parse(raw) as T;
}

function readLiquid(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ---------- 1. asset sizing ----------

function gzipFile(path: string): { bytes: number; gzippedBytes: number } {
  const buf = readFileSync(path);
  return {
    bytes: buf.byteLength,
    gzippedBytes: gzipSync(buf).byteLength,
  };
}

function loadAllAssets(): Map<string, AssetSize> {
  const map = new Map<string, AssetSize>();
  if (!existsSync(ASSETS_DIR)) return map;

  for (const entry of readdirSync(ASSETS_DIR)) {
    const full = join(ASSETS_DIR, entry);
    if (!statSync(full).isFile()) continue;
    const ext = extname(entry).toLowerCase();
    const kind: FileKind | null =
      ext === ".js" ? "js" : ext === ".css" ? "css" : null;
    if (!kind) continue;

    const { bytes, gzippedBytes } = gzipFile(full);
    map.set(entry, { name: entry, bytes, gzippedBytes, kind });
  }
  return map;
}

// ---------- 2. liquid graph traversal ----------

/** Match `{% render 'name' %}` or `{% render "name" %}`. */
const RE_RENDER = /\{%-?\s*render\s+['"]([^'"]+)['"]/g;
/** Match deprecated `{% include 'name' %}`. */
const RE_INCLUDE = /\{%-?\s*include\s+['"]([^'"]+)['"]/g;
/** Match `{% section 'name' %}`. */
const RE_SECTION = /\{%-?\s*section\s+['"]([^'"]+)['"]/g;
/** Match `{% sections 'group-name' %}` (renders a section group JSON). */
const RE_SECTIONS = /\{%-?\s*sections\s+['"]([^'"]+)['"]/g;
/** Match `{% content_for 'block', type: 'name', ... %}`. */
const RE_CONTENT_FOR_BLOCK =
  /\{%-?\s*content_for\s+['"]block['"][^%]*?type:\s*['"]([^'"]+)['"]/g;

/**
 * Match `<script src="{{ 'name.js' | asset_url }}">` or
 * `<link  href="{{ 'name.css' | asset_url }}">` (or modulepreload).
 *
 * Captures the asset filename. The regex tolerates extra attributes/whitespace.
 */
const RE_ASSET =
  /(?:src|href)\s*=\s*["']\s*\{\{\s*['"]([^'"]+\.(?:js|css))['"]\s*\|\s*asset_url\s*\}\}/g;

function collectMatches(re: RegExp, text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  // RegExp objects with `g` flag carry state across calls; reset.
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) out.push(m[1]!);
  return out;
}

interface GraphResult {
  /** All asset filenames statically referenced from this graph. */
  assets: Set<string>;
  /** Liquid files visited (for cycle detection / debugging). */
  visited: Set<string>;
}

/**
 * Walk a `.liquid` file and every file it transitively renders, collecting:
 *   - asset filenames (from `<script src=...>` / `<link href=...>`)
 *   - rendered snippet/section/block names (recursed into)
 *
 * `seen` is shared across the recursion so each file is parsed once.
 */
function walkLiquid(
  path: string,
  seen: Set<string>,
  assets: Set<string>,
): void {
  if (seen.has(path)) return;
  seen.add(path);

  const src = readLiquid(path);
  if (src == null) return;

  for (const a of collectMatches(RE_ASSET, src)) assets.add(a);

  for (const name of collectMatches(RE_RENDER, src)) {
    walkLiquid(join(SNIPPETS_DIR, `${name}.liquid`), seen, assets);
  }
  for (const name of collectMatches(RE_INCLUDE, src)) {
    walkLiquid(join(SNIPPETS_DIR, `${name}.liquid`), seen, assets);
  }
  for (const name of collectMatches(RE_SECTION, src)) {
    walkLiquid(join(SECTIONS_DIR, `${name}.liquid`), seen, assets);
  }
  for (const name of collectMatches(RE_SECTIONS, src)) {
    walkSectionGroup(name, seen, assets);
  }
  for (const name of collectMatches(RE_CONTENT_FOR_BLOCK, src)) {
    // Static block rendering: blocks/<name>.liquid OR blocks/_<name>.liquid.
    const a = join(BLOCKS_DIR, `${name}.liquid`);
    const b = join(BLOCKS_DIR, `_${name}.liquid`);
    walkLiquid(existsSync(a) ? a : b, seen, assets);
  }
}

/**
 * A `{% sections 'header-group' %}` tag renders the section group declared in
 * `sections/<name>.json`. Walk every section it lists.
 */
function walkSectionGroup(
  name: string,
  seen: Set<string>,
  assets: Set<string>,
): void {
  const groupPath = join(SECTIONS_DIR, `${name}.json`);
  if (existsSync(groupPath)) {
    const group = readJSON<{ sections?: Record<string, { type: string }> }>(
      groupPath,
    );
    for (const s of Object.values(group.sections ?? {})) {
      walkLiquid(join(SECTIONS_DIR, `${s.type}.liquid`), seen, assets);
    }
    return;
  }

  // Group JSON absent (e.g. header-group/footer-group are gitignored and
  // sourced from the live store). Fall back to the section named after the
  // group, which is always rendered as part of the group chrome — otherwise
  // every route would silently drop the header/footer asset graphs.
  const base = name.replace(/-group$/, "");
  walkLiquid(join(SECTIONS_DIR, `${base}.liquid`), seen, assets);
}

/**
 * Walk a route's static graph: layout + template's declared sections (and
 * their statically declared blocks).
 */
function walkRoute(template: string): GraphResult {
  const visited = new Set<string>();
  const assets = new Set<string>();

  // Layout root — every route inherits this.
  walkLiquid(LAYOUT_PATH, visited, assets);

  // Template's declared sections + their declared blocks.
  const tplPath = join(TEMPLATES_DIR, `${template}.json`);
  if (existsSync(tplPath)) {
    const tpl = readJSON<{
      sections?: Record<
        string,
        { type: string; blocks?: Record<string, { type: string }> }
      >;
    }>(tplPath);
    for (const section of Object.values(tpl.sections ?? {})) {
      walkLiquid(join(SECTIONS_DIR, `${section.type}.liquid`), visited, assets);
      for (const block of Object.values(section.blocks ?? {})) {
        const a = join(BLOCKS_DIR, `${block.type}.liquid`);
        const b = join(BLOCKS_DIR, `_${block.type}.liquid`);
        walkLiquid(existsSync(a) ? a : b, visited, assets);
      }
    }
  }

  return { visited, assets };
}

// ---------- 3. custom-element registration linter ----------

/**
 * Match `customElements.define("name", ...)` — supports both single-line and
 * multi-line forms (the call may break after the opening paren).
 */
const RE_CUSTOM_ELEMENT_DEFINE =
  /customElements\.define\s*\(\s*["']([a-z][a-z0-9-]*)["']/g;

/**
 * Match dynamic `import("@theme/<name>")` calls in source modules. These
 * defer-loaded modules count toward the registration linter (the element
 * IS reachable from the route via JS) but NOT toward the per-route size
 * budget (that's the whole point of defer-loading per ADR-0003 pillar 7).
 */
const RE_DYNAMIC_IMPORT =
  /import\s*\(\s*["']@theme\/([a-z][a-z0-9-]*)["']\s*\)/g;

/**
 * Build a map: `<source-script>.js` → set of `<target-script>.js` reached
 * via dynamic `import("@theme/<target>")`. Used by the registration linter
 * to follow defer-load chains.
 */
function discoverDynamicImports(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  if (!existsSync(SRC_SCRIPTS_DIR)) return map;
  for (const entry of readdirSync(SRC_SCRIPTS_DIR)) {
    if (!entry.endsWith(".ts")) continue;
    const full = join(SRC_SCRIPTS_DIR, entry);
    if (!statSync(full).isFile()) continue;
    const src = readFileSync(full, "utf8");
    const sourceAsset = entry.replace(/\.ts$/, ".js");
    const targets = new Set<string>();
    for (const target of collectMatches(RE_DYNAMIC_IMPORT, src)) {
      targets.add(`${target}.js`);
    }
    if (targets.size > 0) map.set(sourceAsset, targets);
  }
  return map;
}

/**
 * Compute the transitive closure of `seedAssets` under the dynamic-import
 * graph. Returns the full set of scripts reachable (statically OR via
 * `import("@theme/...")` chains).
 */
function expandDynamicImports(
  seedAssets: Set<string>,
  importMap: Map<string, Set<string>>,
): Set<string> {
  const reachable = new Set(seedAssets);
  const stack = [...seedAssets];
  while (stack.length > 0) {
    const next = stack.pop()!;
    const targets = importMap.get(next);
    if (!targets) continue;
    for (const t of targets) {
      if (!reachable.has(t)) {
        reachable.add(t);
        stack.push(t);
      }
    }
  }
  return reachable;
}

/**
 * Discover the element-name → script-asset mapping by scanning every
 * `src/scripts/*.ts` for `customElements.define(...)` calls. The script's
 * file name (with `.ts` → `.js`) is the asset that registers the element.
 *
 * Auto-discovery means new elements are tracked without touching this script.
 */
function discoverElementMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(SRC_SCRIPTS_DIR)) return map;
  for (const entry of readdirSync(SRC_SCRIPTS_DIR)) {
    if (!entry.endsWith(".ts")) continue;
    const full = join(SRC_SCRIPTS_DIR, entry);
    if (!statSync(full).isFile()) continue;
    const src = readFileSync(full, "utf8");
    const asset = entry.replace(/\.ts$/, ".js");
    for (const name of collectMatches(RE_CUSTOM_ELEMENT_DEFINE, src)) {
      map.set(name, asset);
    }
  }
  return map;
}

/**
 * Find which custom-element tag names from `elementMap` appear as opening tags
 * in `src`. Skips occurrences inside `{% comment %}…{% endcomment %}` blocks,
 * `{%- comment -%}…{%- endcomment -%}` whitespace-trimmed variants, and
 * `{% doc %}…{% enddoc %}` LiquidDoc blocks (which can mention element names
 * in prose, e.g. "wrap in `<product-form-component>`").
 */
function findElementsInLiquid(
  src: string,
  elementMap: Map<string, string>,
): Set<string> {
  // Strip comment + doc blocks so element names mentioned in prose don't false-positive.
  const stripped = src
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, "")
    .replace(/\{%-?\s*doc\s*-?%\}[\s\S]*?\{%-?\s*enddoc\s*-?%\}/g, "");
  const found = new Set<string>();
  for (const name of elementMap.keys()) {
    // Match `<name ` or `<name>` or `<name/>` — not `<name-suffix>`.
    const re = new RegExp(`<${name}(?=[\\s/>])`, "i");
    if (re.test(stripped)) found.add(name);
  }
  return found;
}

// ---------- 4. main ----------

function main(): void {
  if (!existsSync(BUDGET_PATH)) {
    console.error(`✗ perf-budget.json not found at ${BUDGET_PATH}`);
    process.exit(1);
  }
  const budget = readJSON<PerfBudget>(BUDGET_PATH);
  const assets = loadAllAssets();

  if (assets.size === 0) {
    console.error(
      `✗ No built assets found in ${ASSETS_DIR}. Run \`npm run build\` first.`,
    );
    process.exit(1);
  }

  let failed = false;

  // ----- per-file -----
  console.log("Per-file budgets:");
  const excluded = new Set(budget.perFile.exclude ?? []);
  const overFile: AssetSize[] = [];
  for (const a of assets.values()) {
    if (excluded.has(a.name)) continue;
    const cap = budget.perFile[a.kind].maxBytesGzipped;
    if (a.gzippedBytes > cap) overFile.push(a);
  }
  if (overFile.length === 0) {
    console.log(
      `  ✓ ${assets.size} assets within per-file caps (js ≤ ${fmtBytes(budget.perFile.js.maxBytesGzipped)}, css ≤ ${fmtBytes(budget.perFile.css.maxBytesGzipped)} gzipped)`,
    );
  } else {
    failed = true;
    for (const a of overFile) {
      const cap = budget.perFile[a.kind].maxBytesGzipped;
      console.log(
        `  ✗ ${a.name} — ${fmtBytes(a.gzippedBytes)} gzipped (cap ${fmtBytes(cap)}, +${fmtBytes(a.gzippedBytes - cap)})`,
      );
    }
  }

  // ----- per-route -----
  console.log("\nPer-route budgets (initial-paint static graph):");
  const overRoute: RouteFailure[] = [];
  // Cache per-route walk results so the linter pass below can reuse them.
  const routeWalks: Array<{
    route: string;
    visited: Set<string>;
    assetNames: Set<string>;
  }> = [];

  for (const [route, cfg] of Object.entries(budget.perRoute)) {
    const walk = walkRoute(cfg.template);
    routeWalks.push({
      route,
      visited: walk.visited,
      assetNames: walk.assets,
    });

    const sized: AssetSize[] = [];
    let total = 0;
    const missing: string[] = [];
    for (const ref of walk.assets) {
      const a = assets.get(ref);
      if (a == null) {
        missing.push(ref);
        continue;
      }
      sized.push(a);
      total += a.gzippedBytes;
    }
    sized.sort((x, y) => y.gzippedBytes - x.gzippedBytes);

    const ok = total <= cfg.maxBytesGzipped;
    const marker = ok ? "✓" : "✗";
    console.log(
      `  ${marker} ${route.padEnd(18)} ${fmtBytes(total).padStart(9)} / ${fmtBytes(cfg.maxBytesGzipped).padStart(9)}  (${sized.length} assets)`,
    );

    if (missing.length > 0) {
      console.log(
        `      ! referenced but not found in assets/: ${missing.join(", ")}`,
      );
    }

    if (!ok) {
      failed = true;
      overRoute.push({
        route,
        budget: cfg.maxBytesGzipped,
        actual: total,
        delta: total - cfg.maxBytesGzipped,
        assets: sized,
      });
    }
  }

  // ----- detail on failures -----
  if (overRoute.length > 0) {
    console.log("\nOver-budget routes — top contributors:");
    for (const r of overRoute) {
      console.log(
        `\n  ${r.route} (+${fmtBytes(r.delta)} over ${fmtBytes(r.budget)}):`,
      );
      for (const a of r.assets.slice(0, 10)) {
        console.log(
          `    ${a.name.padEnd(40)} ${fmtBytes(a.gzippedBytes).padStart(9)}`,
        );
      }
    }
  }

  // ----- registration linter -----
  console.log("\nCustom-element registration linter:");
  const elementMap = discoverElementMap();
  const dynamicImports = discoverDynamicImports();
  const gaps: RegistrationGap[] = [];

  for (const { route, visited, assetNames } of routeWalks) {
    // For the linter only, expand the route's reachable scripts to include
    // anything reached via dynamic `import("@theme/...")` chains. The size
    // budget already accounted for the static graph above; defer-loaded
    // modules don't count toward it, but they DO count toward "is this
    // element registered somewhere reachable on this route?".
    const reachableAssets = expandDynamicImports(assetNames, dynamicImports);
    for (const file of visited) {
      const src = readLiquid(file);
      if (src == null) continue;
      const elements = findElementsInLiquid(src, elementMap);
      for (const el of elements) {
        const expectedScript = elementMap.get(el)!;
        if (!reachableAssets.has(expectedScript)) {
          gaps.push({
            route,
            liquidFile: relative(ROOT, file),
            element: el,
            script: expectedScript,
          });
        }
      }
    }
  }

  if (gaps.length === 0) {
    console.log(
      `  ✓ all ${elementMap.size} known custom elements have registering scripts in their route's asset graph`,
    );
  } else {
    failed = true;
    for (const g of gaps) {
      console.log(
        `  ✗ ${g.route.padEnd(18)} ${g.liquidFile} emits <${g.element}> but ${g.script} is not loaded on this route`,
      );
    }
    console.log(
      '      → fix: add `<script src="{{ \'<name>.js\' | asset_url }}" type="module">` to the section/snippet that emits the element, or to a parent that always renders it',
    );
  }

  if (failed) {
    console.log(
      "\n✗ Budget check failed. Either reduce asset sizes, defer-load (ADR-0003 pillar 7), or open a PR with [budget-bump] in the title (see docs/perf-budget.md).",
    );
    process.exit(1);
  }
  console.log("\n✓ All budgets within caps.");
}

main();
