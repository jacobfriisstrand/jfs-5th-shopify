import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.page",
  class: "section-wrapper",
  disabled_on: {
    groups: ["header"],
  },
});
