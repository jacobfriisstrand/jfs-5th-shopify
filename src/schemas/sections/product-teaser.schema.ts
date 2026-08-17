import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.product_teaser",
  settings: [
    {
      type: "product",
      id: "product",
      label: "t:settings.product",
    },
    {
      type: "text",
      id: "title",
      label: "t:settings.heading",
    },
    {
      type: "text",
      id: "subtitle",
      label: "t:settings.subheading",
    },
    {
      type: "image_picker",
      id: "image",
      label: "t:settings.image",
    },
    {
      type: "text",
      id: "link_text",
      label: "t:settings.cta_text",
      default: "Shop now",
    },
  ],
  presets: [
    {
      name: "t:names.product_teaser",
      category: "t:categories.banners",
    },
  ],
});
