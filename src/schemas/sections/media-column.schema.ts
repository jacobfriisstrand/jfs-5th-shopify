import { defineMediaSettings, defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.media_column",
  settings: [
    {
      type: "text",
      id: "title",
      label: "t:settings.title",
    },
    {
      type: "textarea",
      id: "subtitle",
      label: "t:settings.subtitle",
    },
    ...defineMediaSettings(),
  ],
  presets: [
    {
      name: "t:names.media_column",
      category: "t:categories.basic",
    },
  ],
});
