"use client";

import type { CompanionMetricPoint, CompanionMetricsWindow } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { AreaChart } from "@/shared/ui/area-chart";
import { Panel, PanelBody, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { LoadReveal } from "@/shared/ui/data-reveal";
import { queryLoadError } from "@/shared/ui/load-error";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Tone } from "@/shared/ui/tone";
import { Gauge, MemoryStick, Timer, UsersRound, type LucideIcon } from "lucide-react";
import { useCompanionMetrics } from "../../api/companion.queries";
import { fixed } from "../../lib/health";

interface ChartSpec {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  values: (p: CompanionMetricPoint) => number | null;
  max: (values: number[], points: CompanionMetricPoint[]) => number;
  format: (value: number) => string;
}

// Each chart scales on its own, TPS against 20 and tick time against the 50 ms budget
const CHARTS: ChartSpec[] = [
  { key: "tps", icon: Gauge, tone: "green", values: (p) => p.tps, max: () => 20, format: (v) => fixed(v, 2) },
  { key: "mspt", icon: Timer, tone: "amber", values: (p) => p.mspt, max: (v) => Math.max(50, ...v) * 1.1, format: (v) => `${fixed(v)} ms` },
  {
    key: "heap",
    icon: MemoryStick,
    tone: "pink",
    values: (p) => p.heapUsed,
    max: (v, points) => Math.max(1, ...points.map((p) => p.heapMax), ...v),
    format: (v) => formatBytes(v),
  },
  { key: "players", icon: UsersRound, tone: "blue", values: (p) => p.players, max: (v) => Math.max(5, ...v) * 1.2, format: (v) => String(Math.round(v)) },
];

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function MetricChart({ spec, points, window }: { spec: ChartSpec; points: CompanionMetricPoint[]; window: CompanionMetricsWindow }) {
  const { t } = useTranslation("modules.companion.performance.charts");
  const Icon = spec.icon;
  // Gaps (a stopped server, Folia with nobody online) are skipped, not drawn as zero
  const rows = points.filter((p) => spec.values(p) != null);
  const data = rows.map((p) => spec.values(p)!);
  const stamp = window === "7d" ? dayFormat : timeFormat;
  const last = data.at(-1);

  return (
    <Panel>
      <PanelHead>
        <Plate tone={spec.tone} size="sm">
          <Icon />
        </Plate>
        <PanelTitle>{t(`${spec.key}.title`)}</PanelTitle>
        <PanelMeta className="ml-auto tabular-nums">{last != null ? spec.format(last) : "—"}</PanelMeta>
      </PanelHead>
      <PanelBody className="grid gap-2">
        {data.length < 2 ? (
          <p className="grid h-40 place-items-center text-center text-[12.5px] text-muted-foreground">{t("noData")}</p>
        ) : (
          <>
            <AreaChart
              grid
              className="h-40"
              max={spec.max(data, rows)}
              series={[{ data, tone: spec.tone }]}
              renderTooltip={(index) => (
                <span className="tabular-nums">
                  {stamp.format(rows[index]?.ts ?? 0)} <b className="font-semibold">{spec.format(data[index] ?? 0)}</b>
                </span>
              )}
            />
            <div className="flex justify-between text-[11.5px] text-muted-foreground">
              <span>{stamp.format(rows[0].ts)}</span>
              <span>{t("now")}</span>
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}

export function MetricCharts({ serverId, window }: { serverId: string; window: CompanionMetricsWindow }) {
  const query = useCompanionMetrics(serverId, window);

  const points = query.data;
  const failed = queryLoadError(query);
  if (failed) return failed;

  return (
    <LoadReveal
      loading={!points}
      className="grid gap-4 lg:grid-cols-2"
      skeleton={CHARTS.map((spec) => (
        <Skeleton key={spec.key} className="h-60 rounded-lg" />
      ))}
    >
      {() => points && CHARTS.map((spec) => <MetricChart key={spec.key} spec={spec} points={points} window={window} />)}
    </LoadReveal>
  );
}
