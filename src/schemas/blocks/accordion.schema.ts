import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.accordion",
  tag: null,
  blocks: [{ type: "_accordion-row" }],
});
