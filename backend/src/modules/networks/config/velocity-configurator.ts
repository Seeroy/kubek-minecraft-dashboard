import type {
  ForwardingMode,
  VelocitySettings,
} from "@shared/types/network.types";
import { TomlPatcher, tomlValue } from "./toml-patcher";
import { applyVelocitySettings } from "./velocity-settings";
import { isBefore } from "../forwarding/backend-forwarding";
import { VELOCITY_3_TEMPLATE, VELOCITY_4_TEMPLATE } from "./velocity-template";

export const VELOCITY_CONFIG = "velocity.toml";
export const FORWARDING_SECRET_FILE = "forwarding.secret";

export interface VelocityServer {
  alias: string;
  address: string;
}

export interface VelocityNetwork {
  mode: ForwardingMode;
  servers: VelocityServer[];
  /** Aliases players are sent to in order, the first one is the default */
  tryList: string[];
  /** Values the user picked, they win over the defaults below */
  settings?: Partial<VelocitySettings>;
}

const TRY_COMMENT =
  "# In what order we should try servers when a player logs in or is kicked from a server.";

function parse(text: string): Record<string, unknown> {
  try {
    return Bun.TOML.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Template for a proxy that never started, bound to the panel assigned port */
export function velocityTemplate(port: number, version?: string): string {
  const template = isBefore(version, "4.0")
    ? VELOCITY_3_TEMPLATE
    : VELOCITY_4_TEMPLATE;
  return TomlPatcher.parse(template)
    .setTopLevel("bind", tomlValue.string(`0.0.0.0:${port}`))
    .toString();
}

/** Port from the bind address, null when the file has none */
export function velocityBindPort(text: string): number | null {
  const bind = parse(text).bind;
  if (typeof bind !== "string") return null;
  const port = Number(bind.slice(bind.lastIndexOf(":") + 1));
  return Number.isInteger(port) && port > 0 ? port : null;
}

/** Writes forwarding and the server list of a network into velocity.toml */
export function configureVelocity(
  text: string,
  network: VelocityNetwork,
): string {
  const patcher = applyVelocitySettings(
    TomlPatcher.parse(text).setTopLevel("online-mode", tomlValue.bool(true)),
    network.settings ?? {},
  )
    .setTopLevel(
      "player-info-forwarding-mode",
      tomlValue.string(network.mode.toUpperCase()),
    )
    .setTopLevel(
      "forwarding-secret-file",
      tomlValue.string(FORWARDING_SECRET_FILE),
    );

  const servers = network.servers.map(
    (s) => `${tomlValue.key(s.alias)} = ${tomlValue.string(s.address)}`,
  );
  patcher.replaceTable("servers", [
    ...servers,
    "",
    TRY_COMMENT,
    `try = ${tomlValue.list(network.tryList)}`,
  ]);

  const forcedHosts = prunedForcedHosts(text, network.servers);
  if (forcedHosts) patcher.replaceTable("forced-hosts", forcedHosts);
  return patcher.toString();
}

// Velocity refuses to start when a forced host points at an unknown server,
// so those targets go away. Null when nothing has to change
function prunedForcedHosts(
  text: string,
  servers: VelocityServer[],
): string[] | null {
  const hosts = parse(text)["forced-hosts"];
  if (!hosts || typeof hosts !== "object") return null;

  const known = new Set(servers.map((s) => s.alias));
  let changed = false;
  const body: string[] = [];
  for (const [host, targets] of Object.entries(hosts)) {
    const list = Array.isArray(targets) ? targets.map(String) : [];
    const kept = list.filter((alias) => known.has(alias));
    if (kept.length !== list.length) changed = true;
    if (kept.length) {
      body.push(`${tomlValue.key(host)} = ${tomlValue.list(kept)}`);
    }
  }
  return changed ? body : null;
}
