"use client";
import { useSocketStore } from "@/shared/context/socket-context";
import { bytesToGB } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import type { WsMetricsData } from "@shared/types/ws/system.types";
import { Activity, Cpu, type LucideIcon } from "lucide-react";
import { memo, useEffect, useState } from "react";

interface SidebarMetricProps {
  percent: number;
  icon: LucideIcon;
  valueText: string;
  colorClass: string;
  bgClass: string;
  glowClass: string;
}

const SidebarMetric = memo(function SidebarMetric({
  percent,
  icon: Icon,
  valueText,
  colorClass,
  bgClass,
  glowClass,
}: SidebarMetricProps) {
  return (
    <div className="group relative h-9 w-full overflow-hidden rounded-md border border-border/50 bg-card">
      <div
        className={cn(
          "absolute inset-y-0 left-0 opacity-10 transition-[width] duration-700 ease-in-out",
          bgClass
        )}
        style={{ width: `${percent}%` }}
      />

      <div className="relative z-10 flex h-full items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5", colorClass)} />
          <span className="text-[11px] font-bold tracking-tight tabular-nums">
            {percent.toFixed(1)}%
          </span>
        </div>

        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
          {valueText}
        </span>
      </div>

      <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-border/20">
        <div
          className={cn(
            "h-full transition-[width] duration-700 ease-in-out",
            bgClass,
            glowClass
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
});

const ResourcesUsage = () => {
  const [metrics, setMetrics] = useState<WsMetricsData>({
    cpu: 0,
    memory: { free: 0, total: 0 },
  });

  const { socket, status, subscribe, unsubscribe } = useSocketStore();

  useEffect(() => {
    if (status !== "connected" || !socket) return;

    const handleMetrics = (data: WsMetricsData) => {
      setMetrics(data);
    };

    subscribe("system:metrics", handleMetrics);

    return () => {
      unsubscribe("system:metrics", handleMetrics);
    };
  }, [status, socket, subscribe, unsubscribe]);

  const usedRam = metrics.memory.total - metrics.memory.free;
  const ramPercent = metrics.memory.total
    ? Number(((usedRam / metrics.memory.total) * 100).toFixed(2))
    : 0;

  return (
    <div className="space-y-1.5">
      <SidebarMetric
        percent={metrics.cpu}
        icon={Cpu}
        valueText="CPU"
        colorClass="text-purple-400"
        bgClass="bg-purple-500"
        glowClass="shadow-[0_0_10px_rgba(168,85,247,0.8)]"
      />

      <SidebarMetric
        percent={ramPercent}
        icon={Activity}
        valueText={`${bytesToGB(usedRam)} / ${bytesToGB(metrics.memory.total)} GB`}
        colorClass="text-pink-400"
        bgClass="bg-pink-500"
        glowClass="shadow-[0_0_10px_rgba(236,72,153,0.8)]"
      />
    </div>
  );
};

export default ResourcesUsage;
