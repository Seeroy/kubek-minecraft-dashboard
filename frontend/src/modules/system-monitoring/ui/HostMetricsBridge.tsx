"use client";

import { useSocketApi } from "@/shared/context/socket-context";
import { WsSystemEventTypes } from "@shared/types/ws/server-events.types";
import { useEffect } from "react";
import { useHostMetrics } from "../store/host-metrics.store";

/** Single system:metrics subscription feeding the host metrics store */
export function HostMetricsBridge() {
  const { subscribe, unsubscribe } = useSocketApi();
  const push = useHostMetrics((s) => s.push);

  useEffect(() => {
    subscribe(WsSystemEventTypes.SYSTEM_METRICS, push);
    return () => unsubscribe(WsSystemEventTypes.SYSTEM_METRICS, push);
  }, [subscribe, unsubscribe, push]);

  return null;
}
