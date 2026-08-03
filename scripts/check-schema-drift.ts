/**
 * scripts/check-schema-drift.ts — report orphaned template/global setting ids.
 *
 * TypeScript schema files are the source of truth for section, block, and
 * global setting ids. Shopify silently ignores unknown keys in
 * `templates/*.json` and `config/settings_data.json`, so drift can sit around
 * unnoticed after a schema setting is removed or renamed.
 *
 * This script is intentionally read-only: it reports orphaned keys and exits
 * non-zero, but never rewrites merchant-owned JSON.
 *
 * Run: `npx tsx scripts/check-schema-drift.ts`
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

import { findSchemaFiles } from "../src/schemas/_internal.ts";

const ROOT = process.cwd();
const SCHEMAS_DIR = join(ROOT, "src", "schemas");
const TEMPLATES_DIR = join(ROOT, "templates");
const SETTINGS_DATA_PATH = join(ROOT, "config", "settings_data.json");

interface SectionSchemaModule {
  default: {
    settings?: unknown[];
  };
}

interface GlobalSettingsModule {
  default: Array<{
    settings?: unknown[];
  }>;
}

interface TemplateSection {
  type?: string;
  settings?: Record<string, unknown>;
  blocks?: Record<string, TemplateBlock>;
}

interface TemplateBlock {
  type?: string;
  settings?: Record<string, unknown>;
}

interface TemplateFile {
  sections?: Record<string, TemplateSection>;
}

interface SettingsDataFile {
  current?: Record<string, unknown>;
  presets?: Record<string, Record<string, unknown>>;
}

interface Drift {
  file: string;
  path: string;
  key: string;
  ownerType: string;
  ownerName: string;
}

function stripLeadingComment(raw: string): string {
  return raw.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
}

function readJSON<T>(path: string): T {
  return JSON.parse(stripLeadingComment(readFileSync(path, "utf8"))) as T;
}

function getSettingIds(settings: unknown[] | undefined): Set<string> {
  return new Set(
    (settings ?? [])
      .filter((setting): setting is { id: string } =>
        Boolean(
          setting &&
          typeof setting === "object" &&
          "id" in setting &&
          typeof setting.id === "string",
        ),
      )
      .map((setting) => setting.id),
  );
}

async function loadSectionAndBlockSettings(): Promise<{
  sections: Map<string, Set<string>>;
  blocks: Map<string, Set<string>>;
}> {
  const sections = new Map<string, Set<string>>();
  const blocks = new Map<string, Set<string>>();

  for (const schemaFile of findSchemaFiles(SCHEMAS_DIR)) {
    if (schemaFile.endsWith("/settings.schema.ts")) continue;

    const rel = relative(SCHEMAS_DIR, schemaFile);
    const [kind] = rel.split("/");
    const name = basename(schemaFile, ".schema.ts");
    const mod = (await import(
      `${schemaFile}?t=${Date.now()}`
    )) as SectionSchemaModule;
    const ids = getSettingIds(mod.default?.settings);

    if (kind === "sections") {
      sections.set(name, ids);
    } else if (kind === "blocks") {
      blocks.set(name, ids);
    }
  }

  return { sections, blocks };
}

async function loadGlobalSettingIds(): Promise<Set<string>> {
  const settingsSchemaPath = resolve(SCHEMAS_DIR, "settings.schema.ts");
  const mod = (await import(
    `${settingsSchemaPath}?t=${Date.now()}`
  )) as GlobalSettingsModule;

  return new Set(
    mod.default.flatMap((group) => Array.from(getSettingIds(group.settings))),
  );
}

// Shopify system keys that live in settings_data.json but are not theme settings
const SHOPIFY_SYSTEM_KEYS = new Set(["sections", "content_for_index"]);

function collectUnknownKeys(
  file: string,
  path: string,
  ownerType: string,
  ownerName: string,
  values: Record<string, unknown> | undefined,
  validIds: Set<string> | undefined,
): Drift[] {
  if (!values || !validIds || validIds.size === 0) return [];

  return Object.keys(values)
    .filter((key) => !validIds.has(key) && !SHOPIFY_SYSTEM_KEYS.has(key))
    .map((key) => ({
      file,
      path: `${path}.${key}`,
      key,
      ownerType,
      ownerName,
    }));
}

function checkTemplates(
  sectionIds: Map<string, Set<string>>,
  blockIds: Map<string, Set<string>>,
): Drift[] {
  if (!existsSync(TEMPLATES_DIR)) return [];

  const drifts: Drift[] = [];

  for (const entry of walkTemplateFiles(TEMPLATES_DIR)) {
    const file = relative(ROOT, entry);
    const template = readJSON<TemplateFile>(entry);

    for (const [sectionId, section] of Object.entries(
      template.sections ?? {},
    )) {
      const sectionType = section.type ?? "(missing type)";
      drifts.push(
        ...collectUnknownKeys(
          file,
          `sections.${sectionId}.settings`,
          "section",
          sectionType,
          section.settings,
          sectionIds.get(sectionType),
        ),
      );

      for (const [blockId, block] of Object.entries(section.blocks ?? {})) {
        const blockType = block.type ?? "(missing type)";
        drifts.push(
          ...collectUnknownKeys(
            file,
            `sections.${sectionId}.blocks.${blockId}.settings`,
            "block",
            blockType,
            block.settings,
            blockIds.get(blockType),
          ),
        );
      }
    }
  }

  return drifts;
}

function walkTemplateFiles(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      out.push(...walkTemplateFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".json")) out.push(fullPath);
  }

  return out;
}

function checkGlobalSettings(validIds: Set<string>): Drift[] {
  if (!existsSync(SETTINGS_DATA_PATH)) return [];

  const file = relative(ROOT, SETTINGS_DATA_PATH);
  const settingsData = readJSON<SettingsDataFile>(SETTINGS_DATA_PATH);

  return [
    ...collectUnknownKeys(
      file,
      "current",
      "global settings",
      "current",
      settingsData.current,
      validIds,
    ),
    ...Object.entries(settingsData.presets ?? {}).flatMap(
      ([presetName, values]) =>
        collectUnknownKeys(
          file,
          `presets.${JSON.stringify(presetName)}`,
          "global preset",
          presetName,
          values,
          validIds,
        ),
    ),
  ];
}

function printReport(drifts: Drift[]): void {
  if (drifts.length === 0) {
    console.log("Schema drift check passed. No orphaned setting ids found.");
    return;
  }

  console.error("Schema drift detected:\n");

  let currentFile = "";
  for (const drift of drifts) {
    if (drift.file !== currentFile) {
      currentFile = drift.file;
      console.error(`- ${currentFile}`);
    }

    console.error(
      `  - ${drift.path} -> unknown key \`${drift.key}\` for ${drift.ownerType} \`${drift.ownerName}\``,
    );
  }
}

async function main(): Promise<void> {
  const [{ sections, blocks }, globalIds] = await Promise.all([
    loadSectionAndBlockSettings(),
    loadGlobalSettingIds(),
  ]);

  const drifts = [
    ...checkTemplates(sections, blocks),
    ...checkGlobalSettings(globalIds),
  ];

  printReport(drifts);

  if (drifts.length > 0) {
    process.exitCode = 1;
  }
}

await main();
