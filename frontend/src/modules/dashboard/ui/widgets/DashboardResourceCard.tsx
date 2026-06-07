"use client";
import { useLiveMetricsBuffer } from "@/modules/system-monitoring/hooks/useLiveMetricsBuffer";
import type { MetricsPoint } from "@/modules/system-monitoring/types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { BlockHeaderColor } from "@/shared/ui/BlockHeader";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent } from "@/shared/ui/card";
import type { LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useMemo } from "react";

const HistoryChart = dynamic(
  () => import("@/modules/system-monitoring/ui/HistoryChart").then((m) => m.HistoryChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    ),
  },
);

interface DashboardResourceCardProps {
  kicker: string;
  title: string;
  icon: LucideIcon;
  color: BlockHeaderColor;
  toValue: (point: MetricsPoint) => number;
  currentValue: number | null;
  currentSubLabel?: string;
  stroke: string;
  bottomFromClass: string;
  bottomBarClass: string;
  formatValue?: (value: number, point: MetricsPoint | null) => string;
}

const DashboardResourceCard: React.FC<DashboardResourceCardProps> = ({
  kicker,
  title,
  icon,
  color,
  toValue,
  currentValue,
  currentSubLabel,
  stroke,
  bottomFromClass,
  bottomBarClass,
  formatValue,
}) => {
  const { t } = useTranslation("modules.systemMonitoring");
  const live = useLiveMetricsBuffer();

  const points = live.points;
  const chartData = useMemo(
    () => points.map((p) => ({ ts: p.ts, value: toValue(p) })),
    [points, toValue],
  );

  const isCritical = (currentValue ?? 0) > 90;
  const displayValue = currentValue != null ? currentValue.toFixed(1) : "-";

  const valueFormatter = useCallback(
    (pct: number) => {
      if (!formatValue) return `${ pct.toFixed(1) }%`;
      const idx = chartData.findIndex((d) => d.value === pct);
      const pt = idx >= 0 ? points[idx] : null;
      return formatValue(pct, pt);
    },
    [formatValue, chartData, points],
  );
  const effectiveValueFormatter = formatValue ? valueFormatter : undefined;

  return (
    <Card className="relative h-full overflow-hidden border-none bg-card shadow-md">
      <CardContent className="p-5 pt-0.5 pb-8 flex flex-col gap-1 h-full">
        <BlockHeader
          kicker={ kicker }
          title={ title }
          icon={ icon }
          color={ isCritical ? "red" : color }
          className="mb-0"
          actions={
            <div className="text-right">
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                  { displayValue }%
                </span>
                <span className="text-xs text-muted-foreground font-medium">/ 100%</span>
              </div>
              { currentSubLabel && (
                <div className="text-xs text-muted-foreground mt-0.5">{ currentSubLabel }</div>
              ) }
            </div>
          }
        />

        <div className="space-y-2 relative z-10 min-h-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            { t("cpu.usageOverTime") }
          </span>
          <HistoryChart
            data={ chartData }
            stroke={ isCritical ? "#ef4444" : stroke }
            fill={ isCritical ? "#ef4444" : stroke }
            unit="%"
            min={ 0 }
            max={ 100 }
            height={ 140 }
            formatValue={ effectiveValueFormatter }
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none">
          <div
            className={ cn(
              "absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t to-transparent transition-[width] duration-500 ease-out opacity-60",
              isCritical ? "from-red-500/20" : bottomFromClass,
            ) }
            style={ { width: `${ currentValue ?? 0 }%` } }
          />
          <div className="h-1 w-full bg-secondary/30" />
          <div
            className={ cn(
              "absolute bottom-0 left-0 h-1 transition-[width] duration-500 ease-out",
              isCritical ? "bg-red-500" : bottomBarClass,
            ) }
            style={ { width: `${ currentValue ?? 0 }%` } }
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardResourceCard;
