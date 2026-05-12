/**
 * Schema Build Script
 *
 * Compiles TypeScript schema files and injects the resulting JSON
 * into corresponding `.liquid` files' {% schema %} tags.
 *
 * Usage: tsx src/schemas/build.ts [optional-file-path]
 *
 * Shared file-discovery and liquid-injection helpers live in
 * `./_internal.ts` so that `src/vite/shopify-schema-plugin.ts` can use the
 * same logic for its watch / HMR paths without copy-pasting.
 */

import { writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { findSchemaFiles, getLiquidTarget, injectSchema } from "./_internal.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const SCHEMAS_DIR = resolve(import.meta.dirname);
const SETTINGS_SCHEMA_OUT = resolve(ROOT, "config/settings_schema.json");

interface SchemaModule {
  default: Record<string, unknown>;
}

async function buildSettingsSchema(schemaFile: string): Promise<string | null> {
  try {
    const mod = (await import(`${schemaFile}?t=${Date.now()}`)) as {
      default: unknown;
    };
    const schema = mod.default;

    if (!Array.isArray(schema)) {
      console.warn(`  ⚠ settings.schema.ts must default-export an array`);
      return null;
    }

    const json = JSON.stringify(schema, null, 2) + "\n";
    writeFileSync(SETTINGS_SCHEMA_OUT, json, "utf-8");
    console.log(`  ✓ config/settings_schema.json`);
    return SETTINGS_SCHEMA_OUT;
  } catch (err) {
    console.error(`  ✗ Error processing ${schemaFile}:`, err);
    return null;
  }
}

async function buildSingle(schemaFile: string): Promise<string | null> {
  const name = basename(schemaFile, ".schema.ts");
  const target = getLiquidTarget(schemaFile, SCHEMAS_DIR, ROOT);

  if (!target) {
    console.warn(`  ⚠ Skipping ${schemaFile}: cannot determine target`);
    return null;
  }

  try {
    const mod = (await import(`${schemaFile}?t=${Date.now()}`)) as SchemaModule;
    const schema = mod.default;

    if (!schema || typeof schema !== "object") {
      console.warn(`  ⚠ No default export in: ${schemaFile}`);
      return null;
    }

    const json = JSON.stringify(schema, null, 2);

    if (injectSchema(target.liquidPath, json)) {
      console.log(`  ✓ ${target.kind}/${name}.liquid`);
      return target.liquidPath;
    }
    console.log(`  · ${target.kind}/${name}.liquid (unchanged)`);
  } catch (err) {
    console.error(`  ✗ Error processing ${schemaFile}:`, err);
  }

  return null;
}

export async function buildSchemas(
  files?: string[],
): Promise<{ changed: string[] }> {
  const allFiles = files ?? findSchemaFiles(SCHEMAS_DIR);
  const changed: string[] = [];

  const settingsSchema = allFiles.find((f) =>
    f.endsWith("/settings.schema.ts"),
  );
  const sectionBlockFiles = allFiles.filter(
    (f) => !f.endsWith("/settings.schema.ts"),
  );

  if (settingsSchema) {
    const result = await buildSettingsSchema(settingsSchema);
    if (result) changed.push(result);
  }

  for (const schemaFile of sectionBlockFiles) {
    const result = await buildSingle(schemaFile);
    if (result) changed.push(result);
  }

  return { changed };
}

// Run directly: `tsx src/schemas/build.ts [optional-file-path]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetFile = process.argv[2];
  const files = targetFile ? [resolve(targetFile)] : undefined;

  console.log(
    targetFile ? `Building schema: ${targetFile}\n` : "Building schemas...\n",
  );
  const { changed } = await buildSchemas(files);
  console.log(`\nDone. ${changed.length} file(s) updated.`);
}
