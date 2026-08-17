import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.announcement_bar",
  class: "announcement-bar",
  settings: [
    {
      type: "text",
      id: "text_1",
      label: "t:settings.announcement_text",
    },
    {
      type: "text",
      id: "text_2",
      label: "t:settings.announcement_text_2",
    },
    {
      type: "range",
      id: "speed",
      label: "t:settings.announcement_speed",
      min: 10,
      max: 60,
      step: 1,
      unit: "s",
      default: 20,
      info: "t:settings.announcement_speed_info",
    },
  ],
  presets: [{ name: "t:names.announcement_bar" }],
});
