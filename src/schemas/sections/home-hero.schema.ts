import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.home_hero",
  enabled_on: {
    templates: ["index"],
  },
  settings: [
    {
      type: "text",
      id: "heading",
      label: "t:settings.heading",
    },
    {
      type: "textarea",
      id: "subheading",
      label: "t:settings.subheading",
    },
    {
      type: "image_picker",
      id: "image",
      label: "t:settings.image",
    },
    {
      type: "text",
      id: "button_label",
      label: "t:settings.button_label",
    },
    {
      type: "url",
      id: "button_link",
      label: "t:settings.button_link",
    },
  ],
  presets: [
    {
      name: "t:names.home_hero",
      category: "t:categories.banners",
    },
  ],
});
