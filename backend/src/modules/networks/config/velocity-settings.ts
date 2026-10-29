import type { VelocitySettings } from "@shared/types/network.types";
import { TomlPatcher, tomlValue } from "./toml-patcher";
import { VELOCITY_4_TEMPLATE } from "./velocity-template";

interface SettingSpec {
  /** Null for a top level key */
  table: string | null;
  key: string;
  type: "string" | "number" | "boolean";
}

const top = (key: string, type: SettingSpec["type"]): SettingSpec => ({
  table: null,
  key,
  type,
});
const advanced = (key: string, type: SettingSpec["type"]): SettingSpec => ({
  table: "advanced",
  key,
  type,
});

/** Where each setting lives in velocity.toml, same in 3.x and 4.x */
export const VELOCITY_SETTINGS: Record<keyof VelocitySettings, SettingSpec> = {
  motd: top("motd", "string"),
  showMaxPlayers: top("show-max-players", "number"),
  onlineMode: top("online-mode", "boolean"),
  forceKeyAuthentication: top("force-key-authentication", "boolean"),
  preventClientProxyConnections: top(
    "prevent-client-proxy-connections",
    "boolean",
  ),
  kickExistingPlayers: top("kick-existing-players", "boolean"),
  announceForge: top("announce-forge", "boolean"),
  compressionThreshold: advanced("compression-threshold", "number"),
  loginRatelimit: advanced("login-ratelimit", "number"),
  connectionTimeout: advanced("connection-timeout", "number"),
  readTimeout: advanced("read-timeout", "number"),
  haproxyProtocol: advanced("haproxy-protocol", "boolean"),
  failoverOnUnexpectedServerDisconnect: advanced(
    "failover-on-unexpected-server-disconnect",
    "boolean",
  ),
  logPlayerConnections: advanced("log-player-connections", "boolean"),
  acceptsTransfers: advanced("accepts-transfers", "boolean"),
  queryEnabled: { table: "query", key: "enabled", type: "boolean" },
};

const NAMES = Object.keys(VELOCITY_SETTINGS) as (keyof VelocitySettings)[];

function parse(text: string): Record<string, unknown> {
  try {
    return Bun.TOML.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function lookup(doc: Record<string, unknown>, spec: SettingSpec): unknown {
  if (!spec.table) return doc[spec.key];
  const table = doc[spec.table];
  return table && typeof table === "object"
    ? (table as Record<string, unknown>)[spec.key]
    : undefined;
}

/** Values of a velocity.toml, defaults stand in for missing or odd ones */
export function readVelocitySettings(
  text: string,
  fallback: VelocitySettings = VELOCITY_DEFAULTS,
): VelocitySettings {
  const doc = parse(text);
  const out = { ...fallback } as Record<keyof VelocitySettings, unknown>;
  for (const name of NAMES) {
    const value = lookup(doc, VELOCITY_SETTINGS[name]);
    if (typeof value === VELOCITY_SETTINGS[name].type) out[name] = value;
  }
  return out as VelocitySettings;
}

export const VELOCITY_DEFAULTS: VelocitySettings = readVelocitySettings(
  VELOCITY_4_TEMPLATE,
  {} as VelocitySettings,
);

function literal(value: unknown, spec: SettingSpec): string | null {
  if (typeof value !== spec.type) return null;
  if (spec.type === "string") return tomlValue.string(value as string);
  if (spec.type === "boolean") return tomlValue.bool(value as boolean);
  return Number.isInteger(value) ? String(value) : null;
}

/** Writes the given settings, values of the wrong type are skipped */
export function applyVelocitySettings(
  patcher: TomlPatcher,
  settings: Partial<VelocitySettings>,
): TomlPatcher {
  for (const name of NAMES) {
    if (!(name in settings)) continue;
    const spec = VELOCITY_SETTINGS[name];
    const value = literal(settings[name], spec);
    if (value === null) continue;
    if (spec.table) patcher.setInTable(spec.table, spec.key, value);
    else patcher.setTopLevel(spec.key, value);
  }
  return patcher;
}
