import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.header_menu_column",
  tag: null,
  settings: [
    {
      type: "text",
      id: "column_heading",
      label: "t:content.column_heading",
    },
  ],
  blocks: [{ type: "_header-menu-link" }],
  presets: [
    {
      name: "t:names.header_menu_column",
      blocks: [
        { type: "_header-menu-link" },
        { type: "_header-menu-link" },
        { type: "_header-menu-link" },
      ],
    },
  ],
});
