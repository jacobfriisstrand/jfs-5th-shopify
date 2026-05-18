#!/usr/bin/env tsx
/**
 * Copies the prebuilt Swiper Element bundle from node_modules into `assets/`
 * so it is served from the Shopify CDN with the rest of the theme's assets
 * (no third-party CDN, no extra DNS hop, CSP-friendly).
 *
 * Loaded lazily by `<featured-collection-carousel>` on first viewport
 * intersection — see `src/scripts/featured-collection-carousel.ts`. This means
 * it does NOT count toward the static initial-paint perf-budget graph.
 */

import { copyFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "node_modules/swiper/swiper-element-bundle.min.js");
const DEST = resolve(ROOT, "assets/swiper-element-bundle.js");

mkdirSync(dirname(DEST), { recursive: true });
copyFileSync(SRC, DEST);
console.log(
  `  ⏵ vendored swiper-element-bundle → ${DEST.replace(ROOT + "/", "")}`,
);
