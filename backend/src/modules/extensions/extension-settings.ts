import type { SettingField } from "@kubekpanel/extension-sdk";

/** KV key both ctx.config and the settings form use */
export const CONFIG_KEY = "__config__";

export const SETTING_TYPES: SettingField["type"][] = [
  "string",
  "number",
  "boolean",
  "select",
  "multiselect",
  "secret",
];

export interface SettingsView {
  schema: SettingField[];
  values: Record<string, unknown>;
  secrets: Record<string, boolean>;
}

export interface SettingError {
  field: string;
  message: string;
}

export const isSecret = (f: SettingField) => f.type === "secret" || f.secret === true;

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Saved value, or the schema default when nothing was saved */
export function withDefaults(
  schema: SettingField[] | undefined,
  saved: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...saved };
  for (const f of schema ?? [])
    if (out[f.key] === undefined && f.default !== undefined) out[f.key] = f.default;
  return out;
}

/** What the form gets, secret values stay on the backend */
export function viewSettings(
  schema: SettingField[] | undefined,
  saved: Record<string, unknown>,
): SettingsView {
  const values: Record<string, unknown> = {};
  const secrets: Record<string, boolean> = {};
  for (const f of schema ?? []) {
    if (isSecret(f)) secrets[f.key] = !isEmpty(saved[f.key]);
    else values[f.key] = saved[f.key] ?? f.default ?? null;
  }
  return { schema: schema ?? [], values, secrets };
}

// A secret is kept unless the form sends a new one or null, null on other fields means the default
export function applySettings(
  schema: SettingField[] | undefined,
  saved: Record<string, unknown>,
  input: Record<string, unknown>,
): { next: Record<string, unknown>; changed: string[]; errors: SettingError[] } {
  const next = { ...saved };
  const errors: SettingError[] = [];
  for (const f of schema ?? []) {
    if (!Object.prototype.hasOwnProperty.call(input, f.key)) continue;
    const value = input[f.key];
    if (isSecret(f)) {
      if (value === null) delete next[f.key];
      else if (typeof value !== "string") errors.push({ field: f.key, message: "type" });
      else if (value !== "") next[f.key] = value;
      continue;
    }
    if (value === null) {
      delete next[f.key];
      continue;
    }
    const typeError = checkType(f, value);
    if (typeError) errors.push({ field: f.key, message: typeError });
    else next[f.key] = value;
  }

  for (const f of schema ?? []) {
    if (errors.some((e) => e.field === f.key)) continue;
    const value = next[f.key] ?? (isSecret(f) ? undefined : f.default);
    const failed = checkRules(f.rules, value);
    if (failed) errors.push({ field: f.key, message: failed });
  }

  const changed = (schema ?? [])
    .map((f) => f.key)
    .filter((key) => JSON.stringify(saved[key]) !== JSON.stringify(next[key]));
  return { next, changed, errors };
}

function checkType(f: SettingField, value: unknown): string | null {
  switch (f.type) {
    case "string":
      return typeof value === "string" ? null : "type";
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "type";
    case "boolean":
      return typeof value === "boolean" ? null : "type";
    case "select":
      if (typeof value !== "string") return "type";
      return (f.options ?? []).includes(value) ? null : "options";
    case "multiselect":
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) return "type";
      return value.every((v) => (f.options ?? []).includes(v)) ? null : "options";
    default:
      return typeof value === "string" ? null : "type";
  }
}

/** First rule the value breaks, as written in the schema, unknown rules pass */
export function checkRules(rules: string | undefined, value: unknown): string | null {
  for (const rule of (rules ?? "").split("|").map((r) => r.trim()).filter(Boolean)) {
    const [name, arg] = rule.split(":", 2);
    if (name === "required") {
      if (isEmpty(value)) return rule;
      continue;
    }
    // Only required cares about an empty value
    if (isEmpty(value)) continue;
    if (name === "url") {
      if (typeof value === "string" && !isHttpUrl(value)) return rule;
    } else if (name === "min" || name === "max") {
      const limit = Number(arg);
      const size = measure(value);
      if (!Number.isFinite(limit) || size === null) continue;
      if (name === "min" ? size < limit : size > limit) return rule;
    }
  }
  return null;
}

function measure(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" || Array.isArray(value)) return value.length;
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
