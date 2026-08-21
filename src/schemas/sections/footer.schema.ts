import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.footer",
  max_blocks: 4,
  enabled_on: {
    groups: ["footer"],
  },
  blocks: [{ type: "menu" }, { type: "@theme" }],
});
