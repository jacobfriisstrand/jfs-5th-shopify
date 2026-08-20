import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.heading",
  settings: [
    {
      type: "text",
      id: "text",
      label: "t:settings.heading",
    },
  ],
  presets: [{ name: "t:names.heading" }],
});
