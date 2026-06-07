import type { MetricsPoint } from "@/modules/system-monitoring/types";
import { useSystemMonitoringQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { useEffect, useState } from "react";

interface LiveBuffer {
  points: MetricsPoint[];
  current: MetricsPoint | null;
}

const MAX_POINTS = 60;

// Buffers the last MAX_POINTS realtime samples in memory for the "now" mode
export function useLiveMetricsBuffer(): LiveBuffer {
  const { data } = useSystemMonitoringQuery();
  const [points, setPoints] = useState<MetricsPoint[]>([]);

  useEffect(() => {
    if (!data) return;
    const total = data.ramUsage.total;
    const used = total - data.ramUsage.available;
    const point: MetricsPoint = {
      ts: new Date(data.timestamp).getTime(),
      cpu: data.cpuUsage.cpu,
      ramUsed: used,
      ramTotal: total,
    };
    setPoints((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].ts === point.ts) return prev;
      const next = [...prev, point];
      if (next.length > MAX_POINTS) next.splice(0, next.length - MAX_POINTS);
      return next;
    });
  }, [data]);

  return {
    points,
    current: points.length > 0 ? points[points.length - 1] : null,
  };
}
