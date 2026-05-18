import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.featured_collection",
  enabled_on: {
    templates: ["index"],
  },
  settings: [
    {
      type: "text",
      id: "heading",
      label: "t:settings.heading",
      default: "Featured products",
    },
    {
      type: "text",
      id: "subheading",
      label: "t:settings.subheading",
    },
    {
      type: "collection",
      id: "collection",
      label: "t:settings.collection",
    },
    {
      type: "range",
      id: "products_to_show",
      label: "t:settings.products_to_show",
      min: 2,
      max: 12,
      step: 1,
      default: 4,
    },
    {
      type: "text",
      id: "link_text",
      label: "t:settings.link_label",
      default: "View all",
    },
  ],
  presets: [
    {
      name: "t:names.featured_collection",
      category: "t:categories.product_list",
    },
  ],
});
