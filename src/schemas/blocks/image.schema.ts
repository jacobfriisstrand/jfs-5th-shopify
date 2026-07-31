import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.image",
  tag: null,
  settings: [
    {
      type: "image_picker",
      id: "image",
      label: "t:settings.image",
    },
  ],
  presets: [
    {
      name: "t:names.image",
    },
  ],
});
