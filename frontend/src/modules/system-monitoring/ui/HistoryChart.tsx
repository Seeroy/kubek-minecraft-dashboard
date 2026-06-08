"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { memo, useCallback, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartPoint {
  ts: number;
  value: number;
}

interface Props {
  data: ChartPoint[];
  stroke: string;
  fill: string;
  unit?: string;
  min?: number;
  max?: number;
  height?: number;
  // Optional formatter for the tooltip raw value (e.g. show bytes -> "1.2 GB")
  formatValue?: (v: number) => string;
}

function formatTickTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 0 } as const;
const AXIS_TICK = { fill: "currentColor", fontSize: 10, opacity: 0.6 } as const;
const X_AXIS_LINE = { stroke: "currentColor", strokeOpacity: 0.1 } as const;
const X_AXIS_DOMAIN = ["dataMin", "dataMax"] as const;
const TOOLTIP_CONTENT_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 8px",
} as const;

function tooltipLabelFormatter(ts: any): string {
  return new Date(Number(ts)).toLocaleString();
}

export const HistoryChart = memo(function HistoryChart({
  data,
  stroke,
  fill,
  unit = "%",
  min = 0,
  max = 100,
  height = 200,
  formatValue,
}: Props) {
  const { t } = useTranslation("modules.systemMonitoring");
  const gradientId = useMemo(
    () => `hg-${Math.random().toString(36).slice(2, 8)}`,
    []
  );
  const yDomain = useMemo(() => [min, max] as [number, number], [min, max]);
  const yTickFormatter = useCallback(
    (v: number) => `${Math.round(v)}${unit}`,
    [unit]
  );
  const tooltipCursor = useMemo(
    () => ({ stroke, strokeOpacity: 0.4 }),
    [stroke]
  );
  const tooltipFormatter = useCallback(
    (value: any) => {
      const num = Number(value);
      return [
        formatValue ? formatValue(num) : `${num.toFixed(1)}${unit}`,
        "",
      ] as [string, string];
    },
    [formatValue, unit]
  );
  const activeDotProps = useMemo(
    () => ({ r: 3, stroke, strokeWidth: 1.5, fill }),
    [stroke, fill]
  );
  const wrapperStyle = useMemo(() => ({ width: "100%", height }), [height]);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={wrapperStyle}
      >
        {t("history.noData")}
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="currentColor"
            strokeOpacity={0.08}
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={X_AXIS_DOMAIN as any}
            tickFormatter={formatTickTime}
            stroke="currentColor"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={X_AXIS_LINE}
            minTickGap={40}
          />
          <YAxis
            domain={yDomain}
            stroke="currentColor"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            cursor={tooltipCursor}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelFormatter={tooltipLabelFormatter}
            formatter={tooltipFormatter}
            separator=""
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            activeDot={activeDotProps}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
