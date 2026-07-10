/**
 * Shopify Liquid Schema Types
 *
 * Provides full TypeScript type safety for Shopify section and block schemas.
 * Use `defineSection()` and `defineBlock()` to create typesafe schemas that
 * compile to JSON and get injected into `.liquid` files.
 */

// ─── Setting Input Types ───────────────────────────────────────────────────────

export interface TextSetting {
  type: "text";
  id: string;
  label: string;
  default?: string;
  placeholder?: string;
  info?: string;
}

export interface TextareaSetting {
  type: "textarea";
  id: string;
  label: string;
  default?: string;
  placeholder?: string;
  info?: string;
}

export interface RichtextSetting {
  type: "richtext";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface InlineRichtextSetting {
  type: "inline_richtext";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface NumberSetting {
  type: "number";
  id: string;
  label: string;
  default?: number;
  placeholder?: string;
  info?: string;
}

export interface RangeSetting {
  type: "range";
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  default: number;
  info?: string;
}

export interface CheckboxSetting {
  type: "checkbox";
  id: string;
  label: string;
  default?: boolean;
  info?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectSetting {
  type: "select";
  id: string;
  label: string;
  options: SelectOption[];
  default?: string;
  info?: string;
  visible_if?: string;
}

export interface RadioSetting {
  type: "radio";
  id: string;
  label: string;
  options: SelectOption[];
  default?: string;
  info?: string;
}

export interface ImagePickerSetting {
  type: "image_picker";
  id: string;
  label: string;
  info?: string;
}

export interface VideoSetting {
  type: "video";
  id: string;
  label: string;
  info?: string;
}

export interface VideoUrlSetting {
  type: "video_url";
  id: string;
  label: string;
  accept: ("youtube" | "vimeo")[];
  default?: string;
  placeholder?: string;
  info?: string;
}

export interface ColorSetting {
  type: "color";
  id: string;
  label: string;
  default?: string;
  alpha?: boolean;
  info?: string;
}

export interface ColorSchemeSetting {
  type: "color_scheme";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface ColorSchemeGroupSetting {
  type: "color_scheme_group";
  id: string;
  label: string;
  definition: unknown[];
  role: Record<string, string>;
}

export interface ColorBackgroundSetting {
  type: "color_background";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface FontPickerSetting {
  type: "font_picker";
  id: string;
  label: string;
  default: string;
  info?: string;
}

export interface UrlSetting {
  type: "url";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface LinkListSetting {
  type: "link_list";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface CollectionSetting {
  type: "collection";
  id: string;
  label: string;
  info?: string;
}

export interface CollectionListSetting {
  type: "collection_list";
  id: string;
  label: string;
  limit?: number;
  info?: string;
}

export interface ProductSetting {
  type: "product";
  id: string;
  label: string;
  info?: string;
}

export interface ProductListSetting {
  type: "product_list";
  id: string;
  label: string;
  limit?: number;
  info?: string;
}

export interface BlogSetting {
  type: "blog";
  id: string;
  label: string;
  info?: string;
}

export interface ArticleSetting {
  type: "article";
  id: string;
  label: string;
  info?: string;
}

export interface ArticleListSetting {
  type: "article_list";
  id: string;
  label: string;
  limit?: number;
  info?: string;
}

export interface PageSetting {
  type: "page";
  id: string;
  label: string;
  info?: string;
}

export interface LiquidSetting {
  type: "liquid";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface HtmlSetting {
  type: "html";
  id: string;
  label: string;
  default?: string;
  info?: string;
}

export interface MetaobjectSetting {
  type: "metaobject";
  id: string;
  label: string;
  info?: string;
}

export interface MetaobjectListSetting {
  type: "metaobject_list";
  id: string;
  label: string;
  limit?: number;
  info?: string;
}

export interface TextAlignmentSetting {
  type: "text_alignment";
  id: string;
  label: string;
  default?: "left" | "center" | "right";
  info?: string;
}

export interface HeaderSetting {
  type: "header";
  content: string;
  info?: string;
}

export interface ParagraphSetting {
  type: "paragraph";
  content: string;
}

// ─── Common Setting Props ──────────────────────────────────────────────────────
// Conditionally-visible / conditionally-enabled settings via Liquid expressions.
// All input settings inherit these via intersection in the `ShopifySetting` union.

export interface CommonSettingProps {
  visible_if?: string;
  available_if?: string;
}

// ─── Union of All Settings ─────────────────────────────────────────────────────

export type ShopifySetting = (
  | TextSetting
  | TextareaSetting
  | RichtextSetting
  | InlineRichtextSetting
  | NumberSetting
  | RangeSetting
  | CheckboxSetting
  | SelectSetting
  | RadioSetting
  | ImagePickerSetting
  | VideoSetting
  | VideoUrlSetting
  | ColorSetting
  | ColorSchemeSetting
  | ColorSchemeGroupSetting
  | ColorBackgroundSetting
  | FontPickerSetting
  | UrlSetting
  | LinkListSetting
  | CollectionSetting
  | CollectionListSetting
  | ProductSetting
  | ProductListSetting
  | BlogSetting
  | ArticleSetting
  | ArticleListSetting
  | PageSetting
  | LiquidSetting
  | HtmlSetting
  | MetaobjectSetting
  | MetaobjectListSetting
  | TextAlignmentSetting
  | HeaderSetting
  | ParagraphSetting
) &
  CommonSettingProps;

// ─── Block Reference ───────────────────────────────────────────────────────────

export interface BlockReference {
  type: "@theme" | "@app" | (string & {});
}

// ─── Preset ────────────────────────────────────────────────────────────────────

export interface SectionPreset {
  name: string;
  category?: string;
  settings?: Record<string, unknown>;
  blocks?: PresetBlock[] | Record<string, PresetBlock>;
  block_order?: string[];
}

export interface PresetBlock {
  type: string;
  name?: string;
  settings?: Record<string, unknown>;
  blocks?: PresetBlock[] | Record<string, PresetBlock>;
  block_order?: string[];
  static?: boolean;
}

export interface BlockPreset {
  name: string;
  category?: string;
  settings?: Record<string, unknown>;
  blocks?: PresetBlock[] | Record<string, PresetBlock>;
  block_order?: string[];
}

// ─── Enabled/Disabled On ──────────────────────────────────────────────────────

export interface EnabledOn {
  templates?: string[];
  groups?: string[];
}

export interface DisabledOn {
  templates?: string[];
  groups?: string[];
}

// ─── Section Schema ────────────────────────────────────────────────────────────

export interface SectionSchema {
  name: string;
  tag?: string | null;
  class?: string;
  limit?: number;
  settings?: ShopifySetting[];
  blocks?: BlockReference[];
  presets?: SectionPreset[];
  default?: {
    settings?: Record<string, unknown>;
    blocks?: PresetBlock[];
  };
  enabled_on?: EnabledOn;
  disabled_on?: DisabledOn;
}

// ─── Block Schema ──────────────────────────────────────────────────────────────

export interface BlockSchema {
  name: string;
  tag?: string | null;
  class?: string;
  limit?: number;
  settings?: ShopifySetting[];
  blocks?: BlockReference[];
  presets?: BlockPreset[];
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Define a typesafe section schema.
 *
 * @example
 * ```ts
 * export default defineSection({
 *   name: "t:general.header",
 *   settings: [
 *     { type: "link_list", id: "menu", label: "t:labels.menu" }
 *   ]
 * });
 * ```
 */
export function defineSection(schema: SectionSchema): SectionSchema {
  return schema;
}

/**
 * Define a typesafe block schema.
 *
 * @example
 * ```ts
 * export default defineBlock({
 *   name: "t:general.text",
 *   settings: [
 *     { type: "text", id: "text", label: "t:labels.text", default: "Text" }
 *   ]
 * });
 * ```
 */
export function defineBlock(schema: BlockSchema): BlockSchema {
  return schema;
}

/**
 * Canonical image-or-video setting pair. Sections that accept either a
 * background image or video should use this instead of manually declaring
 * both `image_picker` and `video` settings.
 *
 * Liquid should check `video` first (with autoplay/muted/loop), falling
 * back to `image`:
 *
 * ```liquid
 * {%- if video != blank -%}
 *   {% render 'video', video: video, autoplay: true, loop: true, muted: true, controls: false, … %}
 * {%- elsif image != blank -%}
 *   {% render 'image', image: image, priority: 'lcp', … %}
 * {%- endif -%}
 * ```
 */
export function defineMediaSettings(options?: {
  imageLabel?: string;
  videoLabel?: string;
}): [ImagePickerSetting, VideoSetting] {
  return [
    {
      type: "image_picker",
      id: "image",
      label: options?.imageLabel ?? "t:settings.image",
    },
    {
      type: "video",
      id: "video",
      label: options?.videoLabel ?? "t:settings.video",
    },
  ];
}
