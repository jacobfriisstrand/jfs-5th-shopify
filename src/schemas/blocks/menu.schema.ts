import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.menu",
  tag: null,
  settings: [
    {
      type: "link_list",
      id: "menu",
      label: "t:content.menu",
      default: "main-menu",
    },
    {
      type: "checkbox",
      id: "show_legal_links",
      label: "t:content.show_legal_links",
      default: false,
    },
  ],
  presets: [{ name: "t:names.menu" }],
});
