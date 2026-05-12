/**
 * scripts/new.ts — scaffold a new section, block, or script.
 *
 * Why this exists: creating a new section/block in this theme requires touching
 * three files in lockstep — `<kind>/<name>.liquid`, `src/schemas/<kind>/<name>.schema.ts`,
 * and (if it ships JS) `snippets/scripts.liquid` for the importmap and the
 * section's own `<script src>` tag. Forgetting any one of them is silent: the
 * theme editor either won't see the section, or the section renders inert
 * because no one registered its custom element. This generator makes the
 * lockstep mandatory.
 *
 * Usage:
 *   npx tsx scripts/new.ts section <name> [--with-script]
 *   npx tsx scripts/new.ts block   <name> [--with-script] [--private]
 *
 * Examples:
 *   npx tsx scripts/new.ts section hero
 *   npx tsx scripts/new.ts section product-recommendations --with-script
 *   npx tsx scripts/new.ts block testimonial --private
 *
 * Flags:
 *   --with-script   Also create src/scripts/<name>.ts (custom-element skeleton),
 *                   register it in snippets/scripts.liquid's importmap, and
 *                   inject a <script src> tag into the new liquid file. The
 *                   custom-element tag name defaults to `<name>-component`.
 *   --private       (blocks only) Prefix the file name with `_` per Shopify
 *                   convention for blocks that are not directly addable in the
 *                   theme editor (rendered only via `{% content_for 'block' %}`
 *                   or as a child of another block).
 *
 * The script refuses to overwrite existing files. If anything already exists,
 * it bails with a non-zero exit and writes nothing — fix the conflict and
 * rerun.
 *
 * After scaffolding, run `npm run schemas` to inject the JSON schema into the
 * `{% schema %}` tag, and add the `t:names.<name>` translation key to
 * `locales/en.default.schema.json`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

// ---------- types ----------

type Kind = "section" | "block";

interface Options {
  kind: Kind;
  name: string;
  withScript: boolean;
  isPrivate: boolean;
}

// ---------- paths ----------

const ROOT = process.cwd();
const SECTIONS_DIR = join(ROOT, "sections");
const BLOCKS_DIR = join(ROOT, "blocks");
const SCHEMAS_SECTIONS_DIR = join(ROOT, "src", "schemas", "sections");
const SCHEMAS_BLOCKS_DIR = join(ROOT, "src", "schemas", "blocks");
const SCRIPTS_DIR = join(ROOT, "src", "scripts");
const SCRIPTS_LIQUID = join(ROOT, "snippets", "scripts.liquid");

// ---------- arg parsing ----------

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2);
  const positional: string[] = [];
  let withScript = false;
  let isPrivate = false;

  for (const arg of args) {
    if (arg === "--with-script") withScript = true;
    else if (arg === "--private") isPrivate = true;
    else if (arg.startsWith("--")) {
      bail(`Unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    bail(
      `Expected <kind> <name>; got ${positional.length} positional arg(s).\n  ${usage()}`,
    );
  }

  const [rawKind, name] = positional;
  if (rawKind !== "section" && rawKind !== "block") {
    bail(`<kind> must be "section" or "block"; got "${rawKind}".`);
  }
  if (rawKind === "section" && isPrivate) {
    bail("--private only applies to blocks.");
  }
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name)) {
    bail(
      `<name> must be kebab-case ([a-z0-9-], must start with a letter and not end with a hyphen); got "${name}".`,
    );
  }

  return { kind: rawKind, name, withScript, isPrivate };
}

function usage(): string {
  return "usage: npx tsx scripts/new.ts <section|block> <name> [--with-script] [--private]";
}

function bail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ---------- templates ----------

function liquidTemplate(opts: {
  kind: Kind;
  name: string;
  customElementTag: string | null;
  scriptAsset: string | null;
}): string {
  const { kind, name, customElementTag, scriptAsset } = opts;
  const wrapper = customElementTag ?? "div";
  const closeWrapper = customElementTag ?? "div";
  const innerComment = `${name}: scaffold — populate as needed.`;

  // Sections render blocks; blocks are leaf-ish unless they nest more blocks.
  const inner =
    kind === "section"
      ? `  {% content_for 'blocks' %}\n`
      : `  {{ block.settings.placeholder | default: '' }}\n`;

  const scriptTag = scriptAsset
    ? `\n{% comment %}\n  Section-owned defer-load (ADR-0003 pillar 7) — registers <${customElementTag}>.\n{% endcomment %}\n<script src="{{ '${scriptAsset}' | asset_url }}" type="module" fetchpriority="low"></script>\n`
    : "";

  return `{% comment %} ${innerComment} {% endcomment %}
<${wrapper} class="${name}">
${inner}</${closeWrapper}>
${scriptTag}
{% schema %}
{}
{% endschema %}
`;
}

function sectionSchemaTemplate(name: string): string {
  return `import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.${toSnake(name)}",
  class: "section-wrapper",
});
`;
}

function blockSchemaTemplate(name: string): string {
  return `import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.${toSnake(name)}",
  tag: null,
});
`;
}

function scriptTemplate(name: string, customElementTag: string): string {
  const className = toPascal(name) + "Component";
  return `import { Component } from "@theme/component";

/**
 * <${customElementTag}> — registered via section-owned <script> tag in the
 * matching .liquid file. See ADR-0003 pillar 7 (defer-load).
 */
class ${className} extends Component {
  override connectedCallback(): void {
    super.connectedCallback();
    // TODO: implementation
  }
}

customElements.define("${customElementTag}", ${className});
`;
}

// ---------- naming helpers ----------

function toSnake(kebab: string): string {
  return kebab.replace(/-/g, "_");
}

function toPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

// ---------- importmap update ----------

/**
 * Insert a `"@theme/<name>": "{{ '<name>.js' | asset_url }}"` line into
 * `snippets/scripts.liquid`'s importmap, alphabetically among the existing
 * `@theme/*` entries. Idempotent: skips silently if the entry already exists.
 *
 * Operates on lines (not raw `indexOf`) because Liquid expression values
 * contain `}}` tokens that confuse naive brace matching.
 */
function addToImportmap(name: string): { added: boolean; reason?: string } {
  if (!existsSync(SCRIPTS_LIQUID)) {
    return { added: false, reason: "snippets/scripts.liquid not found" };
  }
  const src = readFileSync(SCRIPTS_LIQUID, "utf8");
  const specifier = `@theme/${name}`;

  if (src.includes(`"${specifier}":`)) {
    return { added: false, reason: "already in importmap" };
  }

  const lines = src.split("\n");

  // Locate the importmap block by line.
  const startLineIdx = lines.findIndex((l) => l.includes('"imports": {'));
  if (startLineIdx === -1) {
    return { added: false, reason: "no importmap block found" };
  }

  // The closing `}` of the imports block sits on its own line, indented with 4
  // spaces. Liquid `}}` tokens always live inside a `"…"` value, never on a
  // line by themselves.
  const endLineIdx = lines.findIndex(
    (l, i) => i > startLineIdx && /^\s{4}\}\s*$/.test(l),
  );
  if (endLineIdx === -1) {
    return { added: false, reason: "could not locate importmap close `    }`" };
  }

  // Inspect existing @theme entries between start and end to (a) compute key
  // padding and (b) find alphabetical insertion point.
  const entryIndices: number[] = [];
  let maxKeyLen = 0;
  for (let i = startLineIdx + 1; i < endLineIdx; i++) {
    const m = lines[i].match(/^\s+("@theme\/[^"]+"):/);
    if (m) {
      entryIndices.push(i);
      maxKeyLen = Math.max(maxKeyLen, m[1].length);
    }
  }

  const keyText = `"${specifier}"`;
  const padding = " ".repeat(Math.max(1, maxKeyLen - keyText.length + 1));
  const newLine = `      ${keyText}:${padding}"{{ '${name}.js' | asset_url }}"`;

  // Decide insertion index (alphabetical among existing @theme entries).
  let insertAt = endLineIdx; // default: append before close
  for (const i of entryIndices) {
    const m = lines[i].match(/"@theme\/([^"]+)"/);
    if (m && m[1] > name) {
      insertAt = i;
      break;
    }
  }

  // Trailing-comma management: every entry except the last must end with a
  // comma. Inserting in the middle: predecessor already has a comma. Inserting
  // at the end (insertAt === endLineIdx): the previous last entry needs a
  // comma added; the new entry becomes the last.
  if (insertAt === endLineIdx && entryIndices.length > 0) {
    const lastIdx = entryIndices[entryIndices.length - 1];
    if (!lines[lastIdx].endsWith(",")) {
      lines[lastIdx] = lines[lastIdx] + ",";
    }
    lines.splice(insertAt, 0, newLine);
  } else {
    // Inserting before another entry: new entry needs a trailing comma.
    lines.splice(insertAt, 0, newLine + ",");
  }

  writeFileSync(SCRIPTS_LIQUID, lines.join("\n"));
  return { added: true };
}

// ---------- main ----------

function main(): void {
  const opts = parseArgs(process.argv);
  const { kind, name, withScript, isPrivate } = opts;

  const fileBase = isPrivate ? `_${name}` : name;
  const liquidPath =
    kind === "section"
      ? join(SECTIONS_DIR, `${fileBase}.liquid`)
      : join(BLOCKS_DIR, `${fileBase}.liquid`);
  const schemaPath =
    kind === "section"
      ? join(SCHEMAS_SECTIONS_DIR, `${fileBase}.schema.ts`)
      : join(SCHEMAS_BLOCKS_DIR, `${fileBase}.schema.ts`);
  const scriptPath = withScript ? join(SCRIPTS_DIR, `${name}.ts`) : null;

  // Pre-flight: refuse to overwrite anything.
  const conflicts: string[] = [];
  if (existsSync(liquidPath)) conflicts.push(relative(ROOT, liquidPath));
  if (existsSync(schemaPath)) conflicts.push(relative(ROOT, schemaPath));
  if (scriptPath && existsSync(scriptPath))
    conflicts.push(relative(ROOT, scriptPath));
  if (conflicts.length > 0) {
    bail(
      `Refusing to overwrite existing file(s):\n  ${conflicts.join("\n  ")}`,
    );
  }

  const customElementTag = withScript ? `${name}-component` : null;
  const scriptAsset = withScript ? `${name}.js` : null;

  // Write liquid + schema.
  writeFileSync(
    liquidPath,
    liquidTemplate({ kind, name, customElementTag, scriptAsset }),
  );
  writeFileSync(
    schemaPath,
    kind === "section"
      ? sectionSchemaTemplate(name)
      : blockSchemaTemplate(name),
  );

  console.log(`✓ created ${relative(ROOT, liquidPath)}`);
  console.log(`✓ created ${relative(ROOT, schemaPath)}`);

  // Optionally write script + register importmap.
  if (withScript && scriptPath && customElementTag) {
    writeFileSync(scriptPath, scriptTemplate(name, customElementTag));
    console.log(`✓ created ${relative(ROOT, scriptPath)}`);
    const im = addToImportmap(name);
    if (im.added) {
      console.log(`✓ registered @theme/${name} in snippets/scripts.liquid`);
    } else {
      console.log(`! importmap not updated: ${im.reason}`);
    }
  }

  // Reminders.
  console.log("");
  console.log("Next:");
  console.log(
    `  1. add "names.${toSnake(name)}" to locales/en.default.schema.json`,
  );
  console.log("  2. run `npm run schemas` to inject the JSON schema");
  if (kind === "section") {
    console.log(
      `  3. add { "type": "${name}" } to a template's sections array (or use the theme editor)`,
    );
  }
  if (withScript) {
    console.log(
      "  4. fill in the custom-element implementation in the new src/scripts file",
    );
  }
  console.log(
    "  · run `npx tsx scripts/check-budgets.ts` to verify the new section fits its route's budget",
  );
}

main();
