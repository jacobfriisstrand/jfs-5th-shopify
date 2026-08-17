/**
 * Global theme settings (config/settings_schema.json).
 *
 * Edit this file, then run `npm run schemas` (or `npm run build`) to regenerate
 * config/settings_schema.json. The first entry MUST be the `theme_info` group
 * — Shopify uses it for the Theme Editor sidebar header.
 *
 * Keep this small. Reach for section / block schemas before adding a global
 * setting; only put truly cross-cutting toggles here.
 */

import type {
  CheckboxSetting,
  ImagePickerSetting,
  RangeSetting,
  UrlSetting,
} from "./types";

interface ThemeInfoGroup {
  name: "theme_info";
  theme_name: string;
  theme_version: string;
  theme_author: string;
  theme_documentation_url?: string;
  theme_support_email?: string;
}

type Setting = ImagePickerSetting | RangeSetting | CheckboxSetting | UrlSetting;

interface SettingsGroup {
  name: string;
  settings: Setting[];
}

const groups: [ThemeInfoGroup, ...SettingsGroup[]] = [
  {
    name: "theme_info",
    theme_name: "jfs-5th-shopify",
    theme_version: "0.1.0",
    theme_author: "Jacob Friis Strand",
    theme_support_email: "jacob@friis.com",
    theme_documentation_url:
      "https://github.com/jacobfriisstrand/jfs-5th-shopify",
  },

  {
    name: "Branding",
    settings: [
      {
        type: "image_picker",
        id: "logo",
        label: "Logo",
      },
      {
        type: "image_picker",
        id: "favicon",
        label: "Favicon",
        info: "Will be scaled down to 32 × 32px",
      },
      {
        type: "image_picker",
        id: "product_fallback_image",
        label: "Product fallback image",
        info: "Shown when a product has no featured image",
      },
    ],
  },

  {
    name: "Layout",
    settings: [
      {
        type: "range",
        id: "page_width",
        label: "Page width",
        min: 1000,
        max: 1600,
        step: 50,
        unit: "px",
        default: 1400,
      },
    ],
  },

  {
    name: "Social",
    settings: [
      {
        type: "url",
        id: "instagram_url",
        label: "Instagram URL",
      },
      {
        type: "url",
        id: "tiktok_url",
        label: "TikTok URL",
      },
    ],
  },

  {
    name: "Cart",
    settings: [
      {
        type: "checkbox",
        id: "show_add_discount_code",
        label: "Show discount-code field in cart",
        default: false,
      },
    ],
  },
];

export default groups;
