import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.section",
  blocks: [{ type: "@theme" }],
  disabled_on: {
    groups: ["header"],
  },
});
