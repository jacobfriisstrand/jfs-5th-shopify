import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.training",
  enabled_on: {
    templates: ["page"],
  },
  presets: [{ name: "t:names.training" }],
});
