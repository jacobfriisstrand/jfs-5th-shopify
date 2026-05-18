import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.page_hero",
  enabled_on: {
    templates: ["page"],
  },
  settings: [
    {
      type: "inline_richtext",
      id: "heading",
      label: "t:settings.heading",
      default: "Page hero",
    },
    { type: "image_picker", id: "image", label: "t:settings.image" },
  ],
  presets: [{ name: "t:names.page_hero" }],
});
