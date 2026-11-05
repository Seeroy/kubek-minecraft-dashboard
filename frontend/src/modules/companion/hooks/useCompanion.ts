"use client";

import type { CompanionLive, CompanionOverview } from "@/api";
import { useServerLive } from "@/modules/server/store/server-statuses.store";
import { ServerStatus } from "@shared/types/server/server.types";
import { useCompanionOverview } from "../api/companion.queries";
import { useCompanionLiveStore } from "../store/companion-live.store";

/**
 * unsupported: the server type can't run Bukkit plugins
 * missing: no plugin in the plugins folder
 * waiting: installed, but the running server hasn't loaded it yet
 * offline: installed, the server is stopped
 * connected: talking to the panel
 */
export type CompanionState = "loading" | "unsupported" | "missing" | "waiting" | "offline" | "connected";

export interface CompanionView {
  state: CompanionState;
  overview?: CompanionOverview;
  live?: CompanionLive;
  /** Features that need the plugin are usable */
  connected: boolean;
}

export function useCompanion(serverId: string | undefined): CompanionView {
  const overview = useCompanionOverview(serverId);
  const pushed = useCompanionLiveStore((s) => (serverId ? s.byServer[serverId] : undefined));
  const status = useServerLive(serverId ?? "")?.status;
  const live = pushed ?? overview.data?.live;
  const data = overview.data;

  let state: CompanionState;
  if (!data) state = "loading";
  else if (live?.connected) state = "connected";
  else if (!data.supported) state = "unsupported";
  else if (!data.installed) state = "missing";
  else state = status === ServerStatus.RUNNING ? "waiting" : "offline";

  return { state, overview: data, live, connected: state === "connected" };
}
