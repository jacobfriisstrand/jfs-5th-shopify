import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.menu",
  tag: null,
  settings: [
    {
      type: "link_list",
      id: "menu",
      label: "t:labels.menu",
      default: "footer",
    },
  ],
  presets: [{ name: "t:names.menu" }],
});
