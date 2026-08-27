import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.model_size_guide",
  enabled_on: {
    templates: ["page"],
  },
  presets: [{ name: "t:names.model_size_guide" }],
});
