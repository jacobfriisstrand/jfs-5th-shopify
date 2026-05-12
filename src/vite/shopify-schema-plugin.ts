/**
 * Vite Plugin: Shopify Schema Hot Reload
 *
 * Watches TypeScript schema files (src/schemas/**\/*.schema.ts) and when any
 * change is detected:
 *   1. Re-imports the changed schema module (via Vite's SSR loader, or via
 *      the in-process `buildSchemas([file])` helper for build-watch)
 *   2. Serializes the schema to JSON
 *   3. Injects the JSON into the corresponding .liquid file's {% schema %} tag
 *   4. Triggers a page reload so Shopify CLI picks up the change
 *
 * Works in both:
 *   - Dev server mode (`vite serve`) via `handleHotUpdate`
 *   - Build watch mode (`vite build --watch`) via `addWatchFile` + `buildStart`
 *
 * File-discovery and liquid-injection helpers are shared with the CLI builder
 * (`src/schemas/build.ts`) via `src/schemas/_internal.ts`.
 */

import { basename, relative, resolve } from "node:path";

import type { Plugin, ViteDevServer } from "vite-plus";

import {
  findSchemaFiles,
  getLiquidTarget,
  injectSchema,
} from "../schemas/_internal.ts";
import { buildSchemas } from "../schemas/build.ts";

const SCHEMAS_DIR_NAME = "src/schemas";

async function processSchemaFileWithServer(
  schemaPath: string,
  schemasDir: string,
  root: string,
  server: ViteDevServer,
): Promise<string | null> {
  const target = getLiquidTarget(schemaPath, schemasDir, root);
  if (!target) return null;

  try {
    // Invalidate module from Vite's cache so we get fresh content
    const mods = server.moduleGraph.getModulesByFile(schemaPath);
    if (mods) {
      for (const mod of mods) {
        server.moduleGraph.invalidateModule(mod);
      }
    }

    // Use Vite's SSR module loader which handles TS natively
    const mod = await server.ssrLoadModule(schemaPath);
    const schema = mod.default;

    if (!schema || typeof schema !== "object") return null;

    const json = JSON.stringify(schema, null, 2);

    if (injectSchema(target.liquidPath, json)) {
      return target.liquidPath;
    }
  } catch (err) {
    console.error(`[shopify-schema] Error processing ${schemaPath}:`, err);
  }

  return null;
}

export function shopifySchemaPlugin(): Plugin {
  let root: string;
  let schemasDir: string;
  let server: ViteDevServer | undefined;
  let isBuild = false;
  let changedSchemaFile: string | null = null;

  return {
    name: "shopify-schema-hot-reload",

    configResolved(config) {
      root = config.root;
      schemasDir = resolve(root, SCHEMAS_DIR_NAME);
      isBuild = config.command === "build";
    },

    configureServer(srv) {
      server = srv;
      // Watch the schemas directory
      srv.watcher.add(resolve(root, "src/schemas"));
    },

    async buildStart() {
      if (isBuild) {
        // Register all schema files for watching during --watch mode.
        for (const file of findSchemaFiles(schemasDir)) {
          this.addWatchFile(file);
        }

        // Only rebuild the specific schema that changed (set by watchChange).
        // The initial full build is handled by `npm run schemas` in the dev/build scripts.
        if (changedSchemaFile) {
          const file = changedSchemaFile;
          changedSchemaFile = null;
          try {
            await buildSchemas([file]);
          } catch (err) {
            console.error(
              `[shopify-schema] Build failed for ${relative(root, file)}:`,
              err,
            );
          }
        }
      }
    },

    watchChange(id) {
      if (isBuild && id.startsWith(schemasDir) && id.endsWith(".schema.ts")) {
        changedSchemaFile = id;
      }
    },

    async handleHotUpdate({ file }) {
      // Only process .schema.ts files under src/schemas
      if (!file.startsWith(schemasDir) || !file.endsWith(".schema.ts")) {
        return;
      }

      if (!server) return;

      const name = basename(file, ".schema.ts");
      console.log(`[shopify-schema] Schema changed: ${name}`);

      const result = await processSchemaFileWithServer(
        file,
        schemasDir,
        root,
        server,
      );

      if (result) {
        console.log(`[shopify-schema] Updated: ${relative(root, result)}`);

        // Trigger full reload since liquid files changed
        server.ws.send({ type: "full-reload" });
      }

      // Return empty array to prevent default HMR (we handle it ourselves)
      return [];
    },
  };
}
