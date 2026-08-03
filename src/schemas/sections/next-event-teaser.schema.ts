import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.next_event_teaser",
  enabled_on: {
    templates: ["index"],
  },
  settings: [
    {
      type: "product",
      id: "event_product",
      label: "t:settings.event_product",
    },
    {
      type: "text",
      id: "teaser_title",
      label: "t:settings.heading",
    },
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
  ],
  presets: [
    {
      name: "t:names.next_event_teaser",
      category: "t:categories.banners",
    },
  ],
});
