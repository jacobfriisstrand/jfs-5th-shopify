import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.button",
  settings: [
    {
      type: "text",
      id: "text",
      label: "t:content.label",
    },
    {
      type: "url",
      id: "url",
      label: "t:settings.instagram_url",
    },
  ],
  presets: [{ name: "t:names.button" }],
});
