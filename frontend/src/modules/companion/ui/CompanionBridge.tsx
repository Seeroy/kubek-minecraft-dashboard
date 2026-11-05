"use client";

import { useSocketApi } from "@/shared/context/socket-context";
import { qk } from "@/shared/queries/query-keys";
import type { WsCompanionUpdate } from "@shared/types/companion.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useCompanionLiveStore } from "../store/companion-live.store";

/** Single server:companion subscription feeding the live store */
export function CompanionBridge() {
  const { subscribe, unsubscribe } = useSocketApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handle = ({ serverId, ...state }: WsCompanionUpdate) => {
      const before = useCompanionLiveStore.getState().byServer[serverId];
      useCompanionLiveStore.getState().set(serverId, state);
      // Plugin came or went, the install info and plugin row change with it
      if (before?.connected !== state.connected) {
        void queryClient.invalidateQueries({ queryKey: qk.companion.overview(serverId) });
        void queryClient.invalidateQueries({ queryKey: qk.plugins.installed(serverId) });
      }
    };
    subscribe(WsServerEventTypes.COMPANION, handle);
    return () => unsubscribe(WsServerEventTypes.COMPANION, handle);
  }, [subscribe, unsubscribe, queryClient]);

  return null;
}
