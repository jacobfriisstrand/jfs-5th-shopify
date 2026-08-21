import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.apps",
  blocks: [
    { type: "instagram-heading" },
    { type: "instagram-button" },
    { type: "@app" },
  ],
  presets: [
    {
      name: "t:names.apps",
      category: "t:categories.basic",
      blocks: [{ type: "instagram-heading" }, { type: "instagram-button" }],
    },
  ],
});
