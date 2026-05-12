/**
 * @theme/theme-editor
 *
 * Storefront-side glue for Shopify's online-store editor preview iframe.
 *
 * Listens to the `shopify:section:*` and `shopify:block:*` events that the
 * editor dispatches on the parent document and re-runs the work needed to
 * keep the preview in sync (re-render via Section Rendering API, scroll to
 * the active block, etc.).
 *
 * No-ops outside the editor (`Shopify.designMode === false`), so importing
 * this on every page costs ~0 in production.
 *
 * Docs: https://shopify.dev/docs/storefronts/themes/architecture/sections/integration-with-theme-editor
 */

import { sectionRenderer } from "@theme/section-renderer";

type ShopifySectionEvent = CustomEvent<{
  sectionId: string;
  load?: HTMLElement;
}>;

type ShopifyBlockEvent = CustomEvent<{
  sectionId: string;
  blockId: string;
}>;

const isDesignMode = (): boolean =>
  typeof Shopify !== "undefined" && Boolean(Shopify.designMode);

const findSection = (sectionId: string): HTMLElement | null =>
  document.getElementById(`shopify-section-${sectionId}`);

const findBlock = (blockId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`) ??
  document.getElementById(`shopify-block-${blockId}`);

const scrollIntoView = (element: HTMLElement): void => {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
};

/**
 * Re-render a section through the Section Rendering API. The editor
 * dispatches `shopify:section:load` with the freshly-rendered HTML already
 * inserted, so we only need to make sure custom elements are rehydrated;
 * but rendering through our own pipeline guarantees consistency with
 * runtime behaviour (event wiring, hydration markers).
 */
const refreshSection = async (sectionId: string): Promise<void> => {
  const section = findSection(sectionId);
  if (!section) return;

  // Drop any cached HTML so the next render fetches fresh markup.
  await sectionRenderer.renderSection(sectionId, { cache: false });
};

const onSectionLoad = (event: Event): void => {
  const { sectionId } = (event as ShopifySectionEvent).detail;
  void refreshSection(sectionId);
};

const onSectionSelect = (event: Event): void => {
  const { sectionId } = (event as ShopifySectionEvent).detail;
  const section = findSection(sectionId);
  if (section) scrollIntoView(section);
};

const onBlockSelect = (event: Event): void => {
  const { blockId } = (event as ShopifyBlockEvent).detail;
  const block = findBlock(blockId);
  if (block) scrollIntoView(block);
};

if (isDesignMode()) {
  document.addEventListener("shopify:section:load", onSectionLoad);
  document.addEventListener("shopify:section:select", onSectionSelect);
  document.addEventListener("shopify:block:select", onBlockSelect);
}
