import { defineSection } from "../types.ts";

export default defineSection({
  name: "t:names.product_information",
  disabled_on: {
    groups: ["header", "footer"],
  },
});
