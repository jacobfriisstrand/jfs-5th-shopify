import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.header_megamenu",
  tag: null,
  settings: [
    {
      type: "text",
      id: "label",
      label: "t:content.label",
    },
    {
      type: "image_picker",
      id: "image",
      label: "t:content.image",
    },
    {
      type: "url",
      id: "image_link_url",
      label: "t:content.image_link_url",
    },
    {
      type: "text",
      id: "cta_text",
      label: "t:content.cta_text",
    },
    {
      type: "url",
      id: "cta_url",
      label: "t:content.cta_url",
    },
  ],
  blocks: [{ type: "_header-menu-column" }],
  presets: [
    {
      name: "t:names.header_megamenu",
      blocks: [
        { type: "_header-menu-column" },
        { type: "_header-menu-column" },
        { type: "_header-menu-column" },
      ],
    },
  ],
});
