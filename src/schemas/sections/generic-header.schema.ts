import { defineSection } from "../types.js";

export default defineSection({
  name: "t:names.generic_header",
  enabled_on: {
    templates: ["page", "collection"],
  },
  settings: [
    {
      type: "image_picker",
      id: "image",
      label: "t:settings.image",
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
  ],
  presets: [
    {
      name: "t:names.generic_header",
      category: "t:categories.banners",
    },
  ],
});
