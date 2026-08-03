import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.carousel",
  enabled_on: {
    templates: ["index"],
  },
  settings: [
    {
      type: "select",
      id: "card_type",
      label: "t:settings.card_type",
      options: [
        { value: "product", label: "t:names.product_card" },
        { value: "event", label: "t:names.event_card" },
      ],
      default: "product",
    },
    {
      type: "text",
      id: "heading",
      label: "t:settings.heading",
    },
    {
      type: "text",
      id: "subheading",
      label: "t:settings.subheading",
    },
    {
      type: "text",
      id: "cta_text",
      label: "t:settings.cta_text",
    },
    {
      type: "url",
      id: "cta_url",
      label: "t:settings.link",
    },
    {
      type: "collection",
      id: "collection",
      label: "t:settings.collection",
    },
  ],
  presets: [
    {
      name: "t:names.carousel",
      category: "t:categories.product_list",
    },
  ],
});
