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
      type: "select",
      id: "eyebrow_heading_level",
      label: "t:settings.eyebrow_heading_level",
      default: "2",
      options: [
        { value: "1", label: "H1" },
        { value: "2", label: "H2" },
      ],
    },
    {
      type: "select",
      id: "heading_heading_level",
      label: "t:settings.heading_heading_level",
      default: "1",
      options: [
        { value: "1", label: "H1" },
        { value: "2", label: "H2" },
      ],
    },
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
