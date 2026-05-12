#!/usr/bin/env tsx
/**
 * Compiles every `src/scripts/*.ts` to `assets/<name>.js` (ESM, type-stripped only,
 * imports left untouched so the runtime importmap in `snippets/scripts.liquid`
 * resolves `@theme/*` specifiers).
 *
 * Pass `--watch` to keep rebuilding on change.
 */

import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { context as esbuildContext, build as esbuildBuild } from "esbuild";

const ROOT = resolve(import.meta.dirname, "../..");
const SRC = resolve(import.meta.dirname);
const OUT = resolve(ROOT, "assets");

const entryPoints = readdirSync(SRC)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && f !== "build.ts")
  .map((f) => resolve(SRC, f));

const watch = process.argv.includes("--watch");

const options = {
  entryPoints,
  outdir: OUT,
  format: "esm" as const,
  target: "es2022" as const,
  bundle: false, // type-strip only; preserve `@theme/*` imports for the import map
  sourcemap: false,
  logLevel: "info" as const,
};

if (watch) {
  const ctx = await esbuildContext(options);
  await ctx.watch();
  console.log("  ⏵ watching src/scripts → assets …");
} else {
  await esbuildBuild(options);
  console.log(`  ✓ compiled ${entryPoints.length} script(s) → assets/`);
}
