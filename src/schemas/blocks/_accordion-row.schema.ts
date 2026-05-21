import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.accordion_row",
  tag: null,
  settings: [
    {
      type: "text",
      id: "summary",
      label: "t:content.summary",
    },
    {
      type: "richtext",
      id: "content",
      label: "t:content.content_text",
    },
  ],
});
