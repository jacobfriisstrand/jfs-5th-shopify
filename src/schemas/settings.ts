/**
 * Typed setting factory functions for Shopify schemas.
 *
 * Instead of verbose object literals:
 *   { type: "image_picker", id: "background_image", label: "Background image" }
 *
 * Use concise factory calls:
 *   imagePicker("background_image")
 *
 * Labels are auto-derived from the id ("background_image" → "Background image").
 * Override with a string: imagePicker("bg", "Background image")
 */

import type {
  ArticleListSetting,
  ArticleSetting,
  BlogSetting,
  CheckboxSetting,
  CollectionListSetting,
  CollectionSetting,
  ColorBackgroundSetting,
  ColorSchemeGroupSetting,
  ColorSchemeSetting,
  ColorSetting,
  FontPickerSetting,
  HeaderSetting,
  HtmlSetting,
  ImagePickerSetting,
  InlineRichtextSetting,
  LinkListSetting,
  LiquidSetting,
  MetaobjectListSetting,
  MetaobjectSetting,
  NumberSetting,
  PageSetting,
  ParagraphSetting,
  ProductListSetting,
  ProductSetting,
  RadioSetting,
  RangeSetting,
  RichtextSetting,
  SelectOption,
  SelectSetting,
  TextAlignmentSetting,
  TextareaSetting,
  TextSetting,
  UrlSetting,
  VideoSetting,
  VideoUrlSetting,
} from "./types.ts";

// Re-export types so schemas can import everything from one file
export type {
  ArticleListSetting,
  ArticleSetting,
  BlogSetting,
  CheckboxSetting,
  CollectionListSetting,
  CollectionSetting,
  ColorBackgroundSetting,
  ColorSchemeGroupSetting,
  ColorSchemeSetting,
  ColorSetting,
  FontPickerSetting,
  HeaderSetting,
  HtmlSetting,
  ImagePickerSetting,
  InlineRichtextSetting,
  LinkListSetting,
  LiquidSetting,
  MetaobjectListSetting,
  MetaobjectSetting,
  NumberSetting,
  PageSetting,
  ParagraphSetting,
  ProductListSetting,
  ProductSetting,
  RadioSetting,
  RangeSetting,
  RichtextSetting,
  SelectOption,
  SelectSetting,
  TextAlignmentSetting,
  TextareaSetting,
  TextSetting,
  UrlSetting,
  VideoSetting,
  VideoUrlSetting,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Auto-derive a translation key from a setting id: "background_image" → "t:labels.background_image" */
function autoLabel(id: string): string {
  return `t:labels.${id}`;
}

/** Prefix a translation key: t("labels.title") → "t:labels.title" */
export function t(key: string): string {
  return `t:${key}`;
}

// ─── Generic Factory ───────────────────────────────────────────────────────────

type WithIdAndLabel = { type: string; id: string; label: string };
type Opts<T extends WithIdAndLabel> = Omit<T, "type" | "id" | "label"> & {
  label?: string;
};

type FullOpts<T extends WithIdAndLabel> = Omit<T, "type"> & { label?: string };

/**
 * Creates a factory function for a simple setting type (no required extra fields).
 *
 * Usage patterns:
 *   text("title")                          → label auto-derived: "Title"
 *   text("title", "Custom label")          → explicit label
 *   text("title", { default: "Hello" })    → auto label + options
 *   text("title", { label: "Custom", default: "Hello" }) → label in options
 *   text("title", "Label", { default: "Hello" }) → explicit label + options
 *   text({ id: "title", label: "Custom", default: "Hello" }) → object form
 */
function createSetting<T extends WithIdAndLabel>(type: T["type"]) {
  function factory(config: FullOpts<T>): T;
  function factory(
    id: string,
    labelOrOpts?: string | Opts<T>,
    opts?: Opts<T>,
  ): T;
  function factory(
    idOrConfig: string | FullOpts<T>,
    labelOrOpts?: string | Opts<T>,
    opts?: Opts<T>,
  ): T {
    if (typeof idOrConfig === "object") {
      const { id, label, ...rest } = idOrConfig;
      return { type, id, label: label ?? autoLabel(id), ...rest } as T;
    }

    const id = idOrConfig;
    let label: string;
    let options: Opts<T> | undefined;

    if (typeof labelOrOpts === "string") {
      label = labelOrOpts;
      options = opts;
    } else if (typeof labelOrOpts === "object") {
      label = labelOrOpts.label ?? autoLabel(id);
      options = labelOrOpts;
    } else {
      label = autoLabel(id);
    }

    const { label: _label, ...rest } = options ?? {};
    return { type, id, label, ...rest } as T;
  }
  return factory;
}

// ─── Simple Settings ───────────────────────────────────────────────────────────

export const text = createSetting<TextSetting>("text");
export const textarea = createSetting<TextareaSetting>("textarea");
export const richtext = createSetting<RichtextSetting>("richtext");
export const inlineRichtext =
  createSetting<InlineRichtextSetting>("inline_richtext");
export const number = createSetting<NumberSetting>("number");
export const checkbox = createSetting<CheckboxSetting>("checkbox");
export const imagePicker = createSetting<ImagePickerSetting>("image_picker");
export const video = createSetting<VideoSetting>("video");
export const color = createSetting<ColorSetting>("color");
export const colorScheme = createSetting<ColorSchemeSetting>("color_scheme");
export const colorBackground =
  createSetting<ColorBackgroundSetting>("color_background");
export const url = createSetting<UrlSetting>("url");
export const linkList = createSetting<LinkListSetting>("link_list");
export const collection = createSetting<CollectionSetting>("collection");
export const collectionList =
  createSetting<CollectionListSetting>("collection_list");
export const product = createSetting<ProductSetting>("product");
export const productList = createSetting<ProductListSetting>("product_list");
export const blog = createSetting<BlogSetting>("blog");
export const article = createSetting<ArticleSetting>("article");
export const articleList = createSetting<ArticleListSetting>("article_list");
export const page = createSetting<PageSetting>("page");
export const liquid = createSetting<LiquidSetting>("liquid");
export const html = createSetting<HtmlSetting>("html");
export const metaobject = createSetting<MetaobjectSetting>("metaobject");
export const metaobjectList =
  createSetting<MetaobjectListSetting>("metaobject_list");
export const textAlignment =
  createSetting<TextAlignmentSetting>("text_alignment");

// ─── Complex Settings (required options) ───────────────────────────────────────

/** Shared implementation for complex settings with required config fields */
function resolveComplex<T extends WithIdAndLabel>(
  type: T["type"],
  idOrConfig: string | (Omit<T, "type"> & { label?: string }),
  labelOrOpts?: string | (Record<string, unknown> & { label?: string }),
  opts?: Record<string, unknown> & { label?: string },
): T {
  if (typeof idOrConfig === "object") {
    const { id, label, ...rest } = idOrConfig;
    return { type, id, label: label ?? autoLabel(id), ...rest } as T;
  }
  const id = idOrConfig;
  const label =
    typeof labelOrOpts === "string"
      ? labelOrOpts
      : (labelOrOpts?.label ?? autoLabel(id));
  const { label: _label, ...options } =
    typeof labelOrOpts === "object" ? labelOrOpts : (opts ?? {});
  return { type, id, label, ...options } as T;
}

type RangeOpts = Pick<RangeSetting, "min" | "max" | "step" | "default"> &
  Partial<Pick<RangeSetting, "unit" | "info" | "label">>;
type RangeConfig = Omit<RangeSetting, "type"> & { label?: string };

export function range(config: RangeConfig): RangeSetting;
export function range(id: string, opts: RangeOpts): RangeSetting;
export function range(id: string, label: string, opts: RangeOpts): RangeSetting;
export function range(
  idOrConfig: string | RangeConfig,
  labelOrOpts?: string | RangeOpts,
  opts?: RangeOpts,
): RangeSetting {
  return resolveComplex<RangeSetting>("range", idOrConfig, labelOrOpts, opts);
}

type SelectOpts = Pick<SelectSetting, "options"> &
  Partial<Pick<SelectSetting, "default" | "info" | "visible_if" | "label">>;
type SelectConfig = Omit<SelectSetting, "type"> & { label?: string };

export function select(config: SelectConfig): SelectSetting;
export function select(id: string, opts: SelectOpts): SelectSetting;
export function select(
  id: string,
  label: string,
  opts: SelectOpts,
): SelectSetting;
export function select(
  idOrConfig: string | SelectConfig,
  labelOrOpts?: string | SelectOpts,
  opts?: SelectOpts,
): SelectSetting {
  return resolveComplex<SelectSetting>("select", idOrConfig, labelOrOpts, opts);
}

type RadioOpts = Pick<RadioSetting, "options"> &
  Partial<Pick<RadioSetting, "default" | "info" | "label">>;
type RadioConfig = Omit<RadioSetting, "type"> & { label?: string };

export function radio(config: RadioConfig): RadioSetting;
export function radio(id: string, opts: RadioOpts): RadioSetting;
export function radio(id: string, label: string, opts: RadioOpts): RadioSetting;
export function radio(
  idOrConfig: string | RadioConfig,
  labelOrOpts?: string | RadioOpts,
  opts?: RadioOpts,
): RadioSetting {
  return resolveComplex<RadioSetting>("radio", idOrConfig, labelOrOpts, opts);
}

type VideoUrlOpts = Pick<VideoUrlSetting, "accept"> &
  Partial<Pick<VideoUrlSetting, "default" | "placeholder" | "info" | "label">>;
type VideoUrlConfig = Omit<VideoUrlSetting, "type"> & { label?: string };

export function videoUrl(config: VideoUrlConfig): VideoUrlSetting;
export function videoUrl(id: string, opts: VideoUrlOpts): VideoUrlSetting;
export function videoUrl(
  id: string,
  label: string,
  opts: VideoUrlOpts,
): VideoUrlSetting;
export function videoUrl(
  idOrConfig: string | VideoUrlConfig,
  labelOrOpts?: string | VideoUrlOpts,
  opts?: VideoUrlOpts,
): VideoUrlSetting {
  return resolveComplex<VideoUrlSetting>(
    "video_url",
    idOrConfig,
    labelOrOpts,
    opts,
  );
}

type FontPickerOpts = Pick<FontPickerSetting, "default"> &
  Partial<Pick<FontPickerSetting, "info" | "label">>;
type FontPickerConfig = Omit<FontPickerSetting, "type"> & { label?: string };

export function fontPicker(config: FontPickerConfig): FontPickerSetting;
export function fontPicker(id: string, opts: FontPickerOpts): FontPickerSetting;
export function fontPicker(
  id: string,
  label: string,
  opts: FontPickerOpts,
): FontPickerSetting;
export function fontPicker(
  idOrConfig: string | FontPickerConfig,
  labelOrOpts?: string | FontPickerOpts,
  opts?: FontPickerOpts,
): FontPickerSetting {
  return resolveComplex<FontPickerSetting>(
    "font_picker",
    idOrConfig,
    labelOrOpts,
    opts,
  );
}

type ColorSchemeGroupOpts = Pick<
  ColorSchemeGroupSetting,
  "definition" | "role"
> &
  Partial<Pick<ColorSchemeGroupSetting, "label">>;
type ColorSchemeGroupConfig = Omit<ColorSchemeGroupSetting, "type"> & {
  label?: string;
};

export function colorSchemeGroup(
  config: ColorSchemeGroupConfig,
): ColorSchemeGroupSetting;
export function colorSchemeGroup(
  id: string,
  opts: ColorSchemeGroupOpts,
): ColorSchemeGroupSetting;
export function colorSchemeGroup(
  id: string,
  label: string,
  opts: ColorSchemeGroupOpts,
): ColorSchemeGroupSetting;
export function colorSchemeGroup(
  idOrConfig: string | ColorSchemeGroupConfig,
  labelOrOpts?: string | ColorSchemeGroupOpts,
  opts?: ColorSchemeGroupOpts,
): ColorSchemeGroupSetting {
  return resolveComplex<ColorSchemeGroupSetting>(
    "color_scheme_group",
    idOrConfig,
    labelOrOpts,
    opts,
  );
}

// ─── Content Settings (no id/label) ────────────────────────────────────────────

export function header(content: string, info?: string): HeaderSetting {
  return info ? { type: "header", content, info } : { type: "header", content };
}

export function paragraph(content: string): ParagraphSetting {
  return { type: "paragraph", content };
}
