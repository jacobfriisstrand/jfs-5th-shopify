import { defineSection, defineMediaSettings } from "../types.ts";

export default defineSection({
  name: "t:names.home_hero",
  enabled_on: {
    templates: ["index"],
  },
  settings: [
    {
      type: "text",
      id: "eyebrow_text",
      label: "t:settings.eyebrow_text",
    },
    {
      type: "text",
      id: "heading",
      label: "t:settings.heading",
    },
    {
      type: "select",
      id: "h1_source",
      label: "t:settings.h1_source",
      default: "heading",
      options: [
        { value: "heading", label: "t:options.large_heading" },
        { value: "eyebrow", label: "t:options.eyebrow" },
      ],
    },
    {
      type: "textarea",
      id: "subheading",
      label: "t:settings.subheading",
    },
    ...defineMediaSettings(),
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
