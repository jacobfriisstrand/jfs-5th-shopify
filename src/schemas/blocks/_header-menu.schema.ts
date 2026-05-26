import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.menu",
  tag: null,
  settings: [],
  blocks: [{ type: "_header-menu-link" }, { type: "_header-megamenu" }],
  presets: [
    {
      name: "t:names.menu",
      blocks: [{ type: "_header-menu-link" }, { type: "_header-megamenu" }],
    },
  ],
});
