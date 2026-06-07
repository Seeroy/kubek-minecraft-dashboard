"use client";
import type {
  MetricsPoint,
  MetricsWindow,
} from "@/modules/system-monitoring/types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { BlockHeaderColor } from "@/shared/ui/BlockHeader";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent } from "@/shared/ui/card";
import type { LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useMemo } from "react";
import { useMetricsHistoryQuery } from "../api/metrics-history.queries";

const HistoryChart = dynamic(
  () => import("./HistoryChart").then((m) => m.HistoryChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    ),
  }
);

interface Props {
  kicker: string;
  title: string;
  icon: LucideIcon;
  color: BlockHeaderColor;
  scope: string;
  window: MetricsWindow;
  // Convert a raw MetricsPoint into the chart value
  toValue: (p: MetricsPoint) => number;
  // Optional formatter for the tooltip
  formatValue?: (value: number, point: MetricsPoint | null) => string;
  // Inline current value display
  currentValue: number | null;
  currentSubLabel?: string;
  // Strong color of the line/fill
  stroke: string;
  bottomFromClass: string;
  bottomBarClass: string;
  // Realtime buffer used when window === "now"
  livePoints: MetricsPoint[];
}

const ResourceChartCard: React.FC<Props> = ({
  kicker,
  title,
  icon,
  color,
  scope,
  window,
  toValue,
  formatValue,
  currentValue,
  currentSubLabel,
  stroke,
  bottomFromClass,
  bottomBarClass,
  livePoints,
}) => {
  const { t } = useTranslation("modules.systemMonitoring");

  const historyQuery = useMetricsHistoryQuery(
    window === "now" ? undefined : scope,
    window === "now" ? "1h" : window
  );

  const points: MetricsPoint[] =
    window === "now" ? livePoints : (historyQuery.data ?? []);
  const chartData = useMemo(
    () => points.map((p) => ({ ts: p.ts, value: toValue(p) })),
    [points, toValue]
  );

  const isLoading = window !== "now" && historyQuery.isLoading;
  const isCritical = (currentValue ?? 0) > 90;
  const displayValue = currentValue != null ? currentValue.toFixed(1) : "-";

  // For RAM tooltip we need bytes; map perc to point via index
  const valueFormatter = useCallback(
    (pct: number) => {
      if (!formatValue) return `${pct.toFixed(1)}%`;
      const idx = chartData.findIndex((d) => d.value === pct);
      const pt = idx >= 0 ? points[idx] : null;
      return formatValue(pct, pt);
    },
    [formatValue, chartData, points]
  );
  const effectiveValueFormatter = formatValue ? valueFormatter : undefined;

  return (
    <Card className="relative overflow-hidden border-none bg-card shadow-md">
      <CardContent className="flex flex-col gap-6 p-6 pt-3 pb-8">
        <BlockHeader
          kicker={kicker}
          title={title}
          icon={icon}
          color={isCritical ? "red" : color}
          className="mb-0"
          actions={
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                  {displayValue}%
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  / 100%
                </span>
              </div>
              {currentSubLabel && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {currentSubLabel}
                </div>
              )}
            </div>
          }
        />

        <div className="relative z-10 space-y-2">
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {window === "now" ? t("cpu.usageOverTime") : t("history.title")}
          </span>
          <HistoryChart
            data={chartData}
            stroke={isCritical ? "#ef4444" : stroke}
            fill={isCritical ? "#ef4444" : stroke}
            unit="%"
            min={0}
            max={100}
            height={220}
            formatValue={effectiveValueFormatter}
          />
          {isLoading && chartData.length === 0 && (
            <div className="text-xs text-muted-foreground">
              {t("history.loading")}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-0">
          <div
            className={cn(
              "absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t to-transparent opacity-60 transition-[width] duration-500 ease-out",
              isCritical ? "from-red-500/20" : bottomFromClass
            )}
            style={{ width: `${currentValue ?? 0}%` }}
          />
          <div className="h-1 w-full bg-secondary/30" />
          <div
            className={cn(
              "absolute bottom-0 left-0 h-1 transition-[width] duration-500 ease-out",
              isCritical ? "bg-red-500" : bottomBarClass
            )}
            style={{ width: `${currentValue ?? 0}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceChartCard;
