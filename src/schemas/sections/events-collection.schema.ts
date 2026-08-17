import { defineSection } from "../types.js";

export default defineSection({
  name: "t:names.events_collection",
  enabled_on: {
    templates: ["collection"],
  },
  settings: [
    {
      type: "text",
      id: "cta_text",
      label: "t:settings.cta_text",
      default: "View event",
    },
  ],
  presets: [
    {
      name: "t:names.events_collection",
      category: "t:categories.product_list",
    },
  ],
});
