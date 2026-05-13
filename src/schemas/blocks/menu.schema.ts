import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.menu",
  tag: null,
  settings: [
    {
      type: "text",
      id: "heading",
      label: "t:content.heading",
    },
    {
      type: "link_list",
      id: "menu",
      label: "t:content.menu",
      default: "main-menu",
    },
  ],
  presets: [{ name: "t:names.menu" }],
});
