import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.video_module",
  settings: [
    {
      type: "video",
      id: "video",
      label: "t:settings.video",
    },
  ],
  presets: [
    {
      name: "t:names.video_module",
      category: "t:categories.basic",
    },
  ],
});
