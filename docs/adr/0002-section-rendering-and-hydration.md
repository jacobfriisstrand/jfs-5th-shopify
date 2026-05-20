# ADR-0002 — Section Rendering uses idempotent morph + opt-in Hydration; preservation rules are registered, not centralized

## Status

Accepted.

## Context

This theme refreshes parts of the page without full navigation by re-fetching a Section through Shopify's Section Rendering API (`?section_id=…`) and patching the live DOM with a morph diff. Three modules cooperate:

- `src/scripts/morph.ts` — DOM diff. Walks the new tree, drops irrelevant nodes (empty text, initialized shadow templates, Section Rendering API marker comments), copies attributes/children, and calls `Component.updatedCallback()` on touched **Custom elements**.
- `src/scripts/section-renderer.ts` — fetch + per-section in-flight dedupe + abort on stacked requests + optional cache. Calls `morph(existing, fresh, MORPH_OPTIONS)`.
- `src/scripts/section-hydration.ts` — opt-in surgical refresh: render a section, then have morph **only** patch nodes whose `data-hydration-key="<value>"` matches in old & new trees. Everything else is left in place.

Two design pressures shape the seam.

**Pressure 1 — Custom elements need to keep state across a morph.** A popover positioned by Floating UI carries inline `style`. A panel toggled open carries `aria-expanded`. The server response — generated from cookies and URL params — has no idea about that local state, so a naive replace would visually snap. Horizon centralized the answer in `morph.ts` itself with hard-coded lists of attributes, element selectors, and IDs to preserve. Every new stateful element forced an edit to `morph.ts`, and the lists steadily collected debt for elements that no longer existed.

**Pressure 2 — Most pages don't need a full section refresh, just a few personalized fragments.** Shopify edge-caches HTML aggressively, but `?section_id=…` requests can bypass that cache. Re-rendering the whole section every time would flicker the rest of the page (logo, nav, prices, scroll-tied animations) and discard form state. Some theme infrastructures solve this by switching to JSON APIs for personalized data; this codebase keeps server HTML as the source of truth (see ADR-0001) and instead annotates *which* fragments are personalized via `data-hydration-key`.

## Decision

1. **Section Rendering is one **Module**, not three.** `morph.ts`, `section-renderer.ts`, and `section-hydration.ts` are split by mechanical concern (diffing vs. fetching vs. opt-in scheduling), not by architectural seam. They are reasoned about together; consumers only ever call `sectionRenderer.renderSection(…)` or `hydrate(…)`.

2. **Hydration is opt-in via `data-hydration-key`, not a separate pipeline.** Hydration mode reuses the same fetch + morph code; it only changes morph's matching rule from "subtree under section root" to "subtrees rooted at matching `data-hydration-key` values". This keeps one code path warm, tested, and consistent with full section renders.

3. **Preservation rules live with the elements that own the state, not in `morph.ts`.** `morph.ts` exports `registerMorphPreserver(fn)`. A **Custom element** that needs to keep state declares its rule at module top-level:

   ```ts
   // in src/scripts/my-popover.ts
   registerMorphPreserver((oldNode, newNode) => {
     if (oldNode.matches?.("my-popover") && newNode.matches?.("my-popover")) {
       const style = oldNode.getAttribute("style");
       if (style) newNode.setAttribute("style", style);
     }
   });
   ```

   `morph.ts` retains exactly one preservation behavior that is universal and has no element-level owner: the `Component.updatedCallback()` lifecycle hook.

4. **The dead Horizon preservation list is removed.** The hard-coded attributes (`product-grid-view`, `data-current-checked`, `data-previous-checked`, `cart-summary-sticky`) and selectors (`floating-panel-component`, `fieldset.variant-option`, `#account-popover`) targeted elements that do not exist in this stripped-down starter. They were inert. Future restorations from Horizon bring back the elements *and* the preserver rules together — register them at the new element's module.

## Consequences

### Positive

- **Locality.** Each Custom element owns its own preservation rule; there's no global list to grep against an evolving inventory of elements.
- **Cache-aware design surface.** `data-hydration-key` is a single, visible mechanism. Authors can scan a section's Liquid for hydration keys and immediately see which fragments are intentionally personalized.
- **No abstraction tax when unused.** With zero registered preservers and zero `data-hydration-key` attributes, the runtime cost is one empty-array iteration per morph and one `if (mode === "hydration")` branch. Nothing leaks into the common path.
- **Minimal `morph.ts`.** The file no longer accumulates rules from elements that may or may not still exist.

### Negative

- **No central inventory.** A reader cannot answer "which elements preserve state across morph?" without grepping the codebase for `registerMorphPreserver`. Mitigation: this ADR + the `Morph preserver` term in `CONTEXT.md` make the search obvious.
- **Registration ordering is implicit.** Preservers run in import order. If two preservers ever conflict on the same node, the later one wins. No current rule risks this; document on first conflict.
- **No de-registration.** A preserver registered at module top-level lives for the page lifetime. Acceptable because Custom elements aren't hot-swapped — when a `.liquid` file stops loading the script, the preserver simply stops being added.
- **Hydration discovery cost.** A first-time reader has to follow `hydrate()` → `sectionRenderer.renderSection({ mode: "hydration" })` → `morph({ hydrationMode: true })` to understand the surgical path. Mitigation: `CONTEXT.md` defines **Hydration** with a worked example, and this ADR makes the rationale findable.

## Future reviews

Revisit this ADR if any of the following becomes true:

- Two or more preservers conflict on the same node (need ordering / priority / replacement semantics).
- More than ~5 preservers exist across the codebase and reading them all to debug a state-loss bug is the bottleneck (consider a debug helper that dumps the registry).
- A real consumer needs JSON-only Section Rendering (no morph) — possible if a future personalized fragment is purely numeric/text and HTML overhead becomes measurable. At that point, parallel a `renderSectionJSON` interface alongside the existing one rather than retrofit the morph path.
- Hydration scheduling needs more than `requestIdleCallback` after `onDocumentReady` (e.g. visibility-driven, intersection-driven, or interaction-driven). Promote the scheduling decision to its own small module rather than overloading `hydrate()`.
