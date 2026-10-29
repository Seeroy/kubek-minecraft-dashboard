"use client";
import { useServerStore } from "@/modules/server";
import { useMemo } from "react";
import type { PanelState } from "../../lib/wizard-draft";

// "game" is the primary port key of the bundled blueprints
const isPortKey = (key: string) => key === "game" || /port$/i.test(key);

/** Names and ports of the panel servers, the wizard checks its input against them */
export function usePanelState(): PanelState {
  const { servers } = useServerStore();
  return useMemo(() => {
    const ports = new Map<number, string>();
    for (const server of servers)
      for (const [key, value] of Object.entries(server.variables ?? {})) if (isPortKey(key) && Number(value)) ports.set(Number(value), server.name);
    return { names: servers.map((server) => server.name), ports };
  }, [servers]);
}
