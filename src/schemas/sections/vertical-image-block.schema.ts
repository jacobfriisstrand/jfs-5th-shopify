import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.vertical_image_block",
  settings: [
    {
      type: "text",
      id: "heading",
      label: "t:settings.heading",
    },
    {
      type: "textarea",
      id: "body",
      label: "t:settings.body",
    },
    {
      type: "text",
      id: "button_label",
      label: "t:settings.button_label",
    },
    {
      type: "url",
      id: "button_link",
      label: "t:settings.button_link",
    },
    {
      type: "select",
      id: "button_variant",
      label: "t:settings.button_variant",
      options: [
        { value: "base", label: "t:options.base" },
        { value: "link", label: "t:options.link" },
        { value: "noIcon", label: "t:options.no_icon" },
      ],
      default: "base",
    },
    {
      type: "select",
      id: "button_size",
      label: "t:settings.button_size",
      options: [
        { value: "base", label: "t:options.base" },
        { value: "large", label: "t:options.large" },
      ],
      default: "base",
    },
  ],
  blocks: [{ type: "image" }],
  presets: [
    {
      name: "t:names.vertical_image_block",
      category: "t:categories.basic",
    },
  ],
});
