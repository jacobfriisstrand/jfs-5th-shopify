import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.collection_container",
  enabled_on: {
    templates: ["collection"],
  },
  settings: [
    {
      type: "range",
      id: "products_per_page",
      label: "t:labels.products_per_page",
      min: 12,
      max: 48,
      step: 12,
      default: 24,
    },
  ],
});
