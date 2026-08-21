import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:general.collections_grid",
  settings: [
    {
      type: "select",
      id: "grid_item_width",
      label: "t:labels.grid_item_width",
      options: [
        { value: "collections--compact", label: "t:options.size.small" },
        { value: "collections--full", label: "t:options.size.large" },
      ],
      default: "collections--full",
    },
    {
      type: "range",
      id: "grid_gap",
      label: "t:labels.grid_gap",
      min: 0,
      max: 50,
      step: 5,
      unit: "px",
      default: 10,
    },
  ],
  presets: [{ name: "t:general.collections_grid" }],
});
