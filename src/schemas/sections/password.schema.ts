import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.section",
  class: "section-wrapper section-password",
  disabled_on: {
    groups: ["header"],
  },
});
