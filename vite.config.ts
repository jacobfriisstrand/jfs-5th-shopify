import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

import { shopifySchemaPlugin } from "./src/vite/shopify-schema-plugin.ts";

// Detect `--watch` so we only register watcher options in watch mode.
// Setting `build.watch` to an object unconditionally would force every
// `vp build` invocation into watch mode and never exit.
const isWatch = process.argv.includes("--watch");

export default defineConfig({
  staged: {
    "*": "npm run check:fix",
  },
  fmt: {
    printWidth: 80,
    sortImports: true,
    sortTailwindcss: {
      stylesheet: "src/styles/app.css",
    },
    ignorePatterns: ["assets/**", "dist/**", "node_modules/**", "docs/**"],
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    plugins: ["typescript"],
    rules: {
      "no-unused-vars": "off",
      "no-unused-expressions": "off",
      "@typescript-eslint/no-useless-default-assignment": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-implied-eval": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
    ignorePatterns: ["assets/**", "dist/**", "node_modules/**", "docs/**"],
  },
  plugins: [tailwindcss(), shopifySchemaPlugin()],

  build: {
    outDir: "assets",
    emptyOutDir: false,
    // Only set in watch mode — defining `watch` at all enables rollup watcher.
    // Without these excludes, vite re-watches its own outputs in `assets/` and
    // shopify CLI sync churn (.shopify, settings_data.json from theme editor)
    // produces an infinite rebuild loop.
    ...(isWatch && {
      watch: {
        exclude: [
          "assets/**",
          "node_modules/**",
          ".shopify/**",
          ".git/**",
          "config/settings_data.json",
        ],
      },
    }),
    rollupOptions: {
      input: {
        app: "src/styles/app.css",
      },
      output: {
        assetFileNames: "[name][extname]",
      },
    },
  },

  css: {
    devSourcemap: true,
  },
});
