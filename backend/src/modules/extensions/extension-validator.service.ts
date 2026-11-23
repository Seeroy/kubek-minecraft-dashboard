import type {
  Capability,
  KubekExtensionManifest,
  SlotName,
} from "@kubekpanel/extension-sdk";
import { Injectable } from "@nestjs/common";
import { getVersion, satisfiesKubekVersion } from "@/core/utils/updates";
import { isLegacyPermission } from "@shared/access/legacy";
import semver from "semver";
import { SETTING_TYPES } from "./extension-settings";

const ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

const KNOWN_CAPABILITIES: Capability[] = [
  "events:server",
  "events:logs",
  "events:tasks",
  "events:backups",
  "events:players",
  "events:auth",
  "events:files",
  "servers:read",
  "servers:control",
  "http:routes",
  "http:outbound",
  "storage",
  "settings",
  "commands",
  "tasks",
  "process:spawn",
];

// A Record so a slot added to the SDK fails the build until it is listed here
const SLOTS: Record<SlotName, true> = {
  "dashboard.header": true,
  "server.toolbar": true,
  "server.console.actions": true,
  "server.sidebar": true,
  "files.contextMenu": true,
  "settings.footer": true,
  "login.footer": true,
};

const ISOLATION = ["in-process", "worker"];

/** Static manifest checks before install or activation, kept in sync with extensions/scripts/config.ts */
@Injectable()
export class ExtensionValidator {
  /** Returns a list of problems; empty means the manifest is valid */
  validate(manifest: KubekExtensionManifest): string[] {
    const errors: string[] = [];

    if (manifest?.manifestVersion !== 1) {
      errors.push("manifestVersion must be 1");
    }
    if (!manifest?.id || !ID_PATTERN.test(manifest.id)) {
      errors.push("id must be reverse-domain (e.g. com.author.name)");
    }
    if (!manifest?.name) errors.push("name is required");
    if (!manifest?.version || !semver.valid(manifest.version)) {
      errors.push("version must be valid semver");
    }
    if (!manifest?.engines?.kubek) {
      errors.push("engines.kubek is required");
    } else if (!satisfiesKubekVersion(manifest.engines.kubek)) {
      errors.push(
        `engines.kubek ${manifest.engines.kubek} not satisfied by ${getVersion()}`,
      );
    }

    const requires = manifest?.permissions?.requires ?? [];
    if (!Array.isArray(requires)) errors.push("permissions.requires must be a list");
    else
      for (const cap of requires) {
        if (!KNOWN_CAPABILITIES.includes(cap))
          errors.push(`unknown capability "${cap}"`);
      }
    errors.push(...checkDeclares(manifest?.permissions?.declares));

    if (!manifest?.backend && !manifest?.frontend) {
      errors.push("extension must declare a backend or frontend entry");
    }
    for (const half of ["backend", "frontend"] as const) {
      const part = manifest?.[half];
      if (part && (typeof part.entry !== "string" || !part.entry))
        errors.push(`${half}.entry is required`);
    }
    const isolation = manifest?.backend?.isolation;
    if (isolation !== undefined && !ISOLATION.includes(isolation))
      errors.push(`backend.isolation must be "in-process" or "worker"`);

    errors.push(...checkSlots(manifest?.frontend?.contributes?.slots));
    errors.push(...checkSettingsSchema(manifest?.settingsSchema));

    // File icons must be .png
    if (
      manifest?.icon &&
      /\.[a-z0-9]+$/i.test(manifest.icon) &&
      !/\.png$/i.test(manifest.icon)
    ) {
      errors.push(`icon must be a .png file (got "${manifest.icon}")`);
    }

    return errors;
  }
}

function checkDeclares(declares: unknown): string[] {
  if (declares === undefined) return [];
  if (!Array.isArray(declares)) return ["permissions.declares must be a list"];
  const errors: string[] = [];
  for (const def of declares) {
    if (typeof def?.key !== "string" || !def.key) {
      errors.push("every declared permission needs a key");
    } else if (isLegacyPermission(def.key)) {
      errors.push(`permission "${def.key}" is a core permission`);
    }
  }
  return errors;
}

function checkSlots(slots: unknown): string[] {
  if (slots === undefined) return [];
  if (!Array.isArray(slots)) return ["frontend.contributes.slots must be a list"];
  const errors: string[] = [];
  for (const s of slots) {
    if (!Object.hasOwn(SLOTS, s?.slot)) errors.push(`unknown slot "${s?.slot}"`);
    if (typeof s?.component !== "string" || !s.component)
      errors.push(`slot "${s?.slot}" needs a component`);
  }
  return errors;
}

function checkSettingsSchema(schema: unknown): string[] {
  if (schema === undefined) return [];
  if (!Array.isArray(schema)) return ["settingsSchema must be a list"];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const f of schema) {
    const key = f?.key;
    if (typeof key !== "string" || !key) {
      errors.push("every settingsSchema field needs a key");
      continue;
    }
    if (seen.has(key)) errors.push(`settingsSchema key "${key}" is used twice`);
    seen.add(key);
    if (!SETTING_TYPES.includes(f.type))
      errors.push(`settingsSchema "${key}" has unknown type "${f.type}"`);
    if (
      (f.type === "select" || f.type === "multiselect") &&
      (!Array.isArray(f.options) || !f.options.length || f.options.some((o: unknown) => typeof o !== "string"))
    )
      errors.push(`settingsSchema "${key}" needs a list of options`);
  }
  return errors;
}
