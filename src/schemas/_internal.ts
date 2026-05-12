/**
 * Schema build internals
 *
 * Shared helpers used by:
 *   - `src/schemas/build.ts`             (one-shot CLI / `npm run schemas`)
 *   - `src/vite/shopify-schema-plugin.ts` (HMR + build-watch hot reload)
 *
 * Anything in this file is a *pure* helper — no dynamic `import()` of schema
 * modules (build.ts uses `import()` with a cache-buster, the vite plugin uses
 * `server.ssrLoadModule`). Each caller owns its own loading strategy.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export interface LiquidTarget {
  liquidPath: string;
  kind: "sections" | "blocks";
  name: string;
}

const SCHEMA_BLOCK_RE =
  /\{%[-\s]*schema\s*[-]?%\}[\s\S]*?\{%[-\s]*endschema\s*[-]?%\}/;

/**
 * Recursively collect all `*.schema.ts` files under `dir`.
 * Returns an empty array if `dir` does not exist.
 */
export function findSchemaFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        files.push(...findSchemaFiles(fullPath));
      } else if (entry.endsWith(".schema.ts")) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory may not exist during initial setup
  }
  return files;
}

/**
 * Map a schema file path (e.g. `src/schemas/sections/header.schema.ts`)
 * to its target liquid file (e.g. `<root>/sections/header.liquid`).
 *
 * Returns `null` for schema files that do not live directly under
 * `<schemasDir>/sections/` or `<schemasDir>/blocks/` — those are handled
 * by their own callers (e.g. `settings.schema.ts`).
 */
export function getLiquidTarget(
  schemaPath: string,
  schemasDir: string,
  root: string,
): LiquidTarget | null {
  const rel = relative(schemasDir, schemaPath).replace(".schema.ts", "");
  const parts = rel.split("/");

  if (parts.length !== 2) return null;

  const [kind, name] = parts;
  if (kind !== "sections" && kind !== "blocks") return null;
  if (!name) return null;

  return {
    liquidPath: resolve(root, kind, `${name}.liquid`),
    kind,
    name,
  };
}

/**
 * Replace the `{% schema %}…{% endschema %}` block in `liquidPath` with
 * `schemaJson`. Returns true if the file was actually written (i.e. the
 * JSON differed from what was already there).
 */
export function injectSchema(liquidPath: string, schemaJson: string): boolean {
  let content: string;
  try {
    content = readFileSync(liquidPath, "utf-8");
  } catch {
    return false;
  }

  if (!SCHEMA_BLOCK_RE.test(content)) return false;

  const newSchemaBlock = `{% schema %}\n${schemaJson}\n{% endschema %}`;
  const updated = content.replace(SCHEMA_BLOCK_RE, newSchemaBlock);

  if (updated !== content) {
    writeFileSync(liquidPath, updated, "utf-8");
    return true;
  }

  return false;
}
