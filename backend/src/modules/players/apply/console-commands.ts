import type { PlayerGamemode } from "@shared/types/players.types";
import type { ListChange } from "../lists/list-codec";

export interface TeleportTarget {
  x: number;
  y: number;
  z: number;
  /** Namespaced id, the current dimension when missing */
  dimension?: string;
}

const MAX_REASON = 256;

/** One console line, control characters would end the command early */
export function cleanReason(reason: string | undefined): string {
  return (reason ?? "")
    .replace(/\p{Cc}+/gu, " ")
    .trim()
    .slice(0, MAX_REASON);
}

const withReason = (command: string, reason: string) =>
  reason ? `${command} ${reason}` : command;

const COMMANDS: {
  [K in ListChange["list"]]: {
    add: (change: Extract<ListChange, { list: K; action: "add" }>) => string;
    remove: (
      change: Extract<ListChange, { list: K; action: "remove" }>,
    ) => string;
  };
} = {
  whitelist: {
    add: (c) => `whitelist add ${c.player.name}`,
    remove: (c) => `whitelist remove ${c.name}`,
  },
  ops: {
    add: (c) => `op ${c.player.name}`,
    remove: (c) => `deop ${c.name}`,
  },
  bans: {
    add: (c) => withReason(`ban ${c.player.name}`, cleanReason(c.reason)),
    remove: (c) => `pardon ${c.name}`,
  },
  ipBans: {
    add: (c) => withReason(`ban-ip ${c.ip}`, cleanReason(c.reason)),
    remove: (c) => `pardon-ip ${c.ip}`,
  },
};

export function commandFor(change: ListChange): string {
  const build: (change: ListChange) => string =
    COMMANDS[change.list][change.action];
  return build(change);
}

export function kickCommand(name: string, reason?: string): string {
  return withReason(`kick ${name}`, cleanReason(reason));
}

export function whitelistToggleCommand(enabled: boolean): string {
  return `whitelist ${enabled ? "on" : "off"}`;
}

export const gamemodeCommand = (name: string, mode: PlayerGamemode) =>
  `gamemode ${mode} ${name}`;

// No exponent form, the command parser wants plain numbers
const coord = (value: number) => String(Math.round(value * 1000) / 1000);

export function teleportCommand(
  name: string,
  to: TeleportTarget,
  legacy = false,
): string {
  const tp = `tp ${name} ${coord(to.x)} ${coord(to.y)} ${coord(to.z)}`;
  if (!to.dimension) return tp;
  if (legacy) throw new LegacyCommandError();
  return `execute in ${to.dimension} run ${tp}`;
}

// Before 1.13 there's no effect give and the ids are numbers
const effect = (name: string, id: string, legacyId: number, legacy: boolean) =>
  legacy
    ? `effect ${name} ${legacyId} 1 10 true`
    : `effect give ${name} minecraft:${id} 1 10 true`;

// Amplifier 10 is plenty, much higher overflows into damage
export const healCommand = (name: string, legacy = false) =>
  effect(name, "instant_health", 6, legacy);

export const feedCommand = (name: string, legacy = false) =>
  effect(name, "saturation", 23, legacy);

/** The server is too old for this command */
export class LegacyCommandError extends Error {}
