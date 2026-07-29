import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.header",
  tag: "header",
  blocks: [
    { type: "_header-logo" },
    { type: "_header-menu" },
    { type: "_header-search" },
    { type: "_header-account" },
    { type: "_header-cart" },
  ],
});
