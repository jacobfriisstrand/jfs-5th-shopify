import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.header_menu_link",
  tag: null,
  settings: [
    {
      type: "text",
      id: "label",
      label: "t:content.label",
    },
    {
      type: "url",
      id: "url",
      label: "t:content.url",
    },
  ],
  presets: [{ name: "t:names.header_menu_link" }],
});
