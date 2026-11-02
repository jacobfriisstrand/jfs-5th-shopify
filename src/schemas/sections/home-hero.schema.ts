import {
  defineSection,
  defineMediaSettings,
  defineTitleBlockSettings,
} from "../types.ts";

export default defineSection({
  name: "t:names.home_hero",
  enabled_on: {
    templates: ["index"],
  },
  settings: [
    ...defineTitleBlockSettings({
      defaultHeadingLine: "title_h1",
      levels: ["h1"],
    }),
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
