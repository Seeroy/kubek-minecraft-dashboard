"use client";
import { useServerLive } from "@/modules/server/store/server-statuses.store";
import { usesLegacyCommands } from "@shared/players/game-version";
import { ServerStatus } from "@shared/types/server/server.types";

export function usePlayerPresence(serverId: string, name: string | null) {
  const live = useServerLive(serverId);
  // The store keeps the last player sample after a stop
  const running = live?.status === ServerStatus.RUNNING;
  const lower = name?.toLowerCase();
  return {
    online: running && !!lower && !!live?.players?.list?.some((entry) => entry.toLowerCase() === lower),
    legacy: usesLegacyCommands(live?.version),
  };
}
