"use client";
import { resolveServerStatus, useAllServerStatuses, useServerStore } from "@/modules/server";
import { ServerStatus } from "@shared/types/server/server.types";
import { useMemo } from "react";

/** Counts across all servers, used by the header and the stat strip */
export function useServersSummary() {
  const { servers } = useServerStore();
  const statuses = useAllServerStatuses();

  return useMemo(() => {
    let running = 0;
    let starting = 0;
    let players = 0;
    const names: string[] = [];
    for (const server of servers) {
      const live = statuses[server.id];
      const status = resolveServerStatus(live, server.status);
      if (status === ServerStatus.RUNNING) running++;
      if (status === ServerStatus.STARTING) starting++;
      players += live?.players?.online ?? 0;
      for (const name of live?.players?.list ?? []) if (names.length < 5) names.push(name);
    }
    return { total: servers.length, running, starting, players, sampleNames: names };
  }, [servers, statuses]);
}
