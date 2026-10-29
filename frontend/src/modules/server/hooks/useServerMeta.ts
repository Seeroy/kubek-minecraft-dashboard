"use client";

import type { Server, ServerStatusData } from "@/modules/server";
import { resolveServerStatus } from "@/modules/server/store/server-statuses.store";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { ServerStatus } from "@shared/types/server/server.types";

export const statusTextTone: Record<ServerStatus, string> = {
  [ServerStatus.RUNNING]: "text-success",
  [ServerStatus.STOPPED]: "text-muted-foreground",
  [ServerStatus.STARTING]: "text-warn",
  [ServerStatus.STOPPING]: "text-c-orange",
  [ServerStatus.CRASHED]: "text-danger",
};

/** No process behind the server, after a normal stop or a crash */
export const isOffline = (status: string | undefined) => status === ServerStatus.STOPPED || status === ServerStatus.CRASHED;

/** Display fields shared by the cards and table views */
export function useServerMeta(server: Server, live: ServerStatusData | null | undefined) {
  const blueprint = useBlueprint(server.blueprintId);
  const status = resolveServerStatus(live, server.status);
  const online = live?.players?.online ?? live?.runtime?.playersOnline;
  const max = live?.players?.max;
  const version = server.variables?.GAME_VERSION;

  return {
    status,
    running: status === ServerStatus.RUNNING,
    players: status === ServerStatus.RUNNING && typeof online === "number" ? { online, max } : null,
    version: version != null ? String(version) : null,
    coreLabel: blueprint?.shortName ?? blueprint?.name ?? null,
  };
}

export const formatPlayers = (players: { online: number; max?: number } | null) =>
  players ? (players.max ? `${players.online} / ${players.max}` : `${players.online}`) : "—";
