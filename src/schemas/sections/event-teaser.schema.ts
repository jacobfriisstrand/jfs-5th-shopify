import { defineSection, defineTitleBlockSettings } from "../types.ts";

export default defineSection({
  name: "t:names.event_teaser",
  enabled_on: {
    templates: ["index"],
  },
  settings: [
    {
      type: "image_picker",
      id: "image",
      label: "t:settings.image",
    },
    ...defineTitleBlockSettings({ levels: ["h2"] }),
    {
      type: "textarea",
      id: "body",
      label: "t:settings.body",
    },
    {
      type: "text",
      id: "cta_text",
      label: "t:settings.cta_text",
      default: "Learn more",
    },
    {
      type: "product",
      id: "event_product",
      label: "t:settings.event_product",
    },
  ],
  presets: [
    {
      name: "t:names.event_teaser",
      category: "t:categories.banners",
    },
  ],
});
