import type { ListChange } from "../lists/list-codec";

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
