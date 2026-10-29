"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { AreaChart, Sparkline } from "@/shared/ui/area-chart";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Meter } from "@/shared/ui/meter";
import { PageHeader } from "@/shared/ui/page-header";
import { Panel, PanelBody, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Stat, StatStrip } from "@/shared/ui/stat-strip";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { toneClass } from "@/shared/ui/tone";
import { Activity, AlertTriangle, Cpu, HardDrive } from "lucide-react";
import { useMemo, useState } from "react";
import { useMetricsHistoryQuery } from "../api/metrics-history.queries";
import { useSystemMonitoringQuery } from "../api/system-monitoring.queries";
import { useHostMetrics } from "../store/host-metrics.store";
import type { MetricsWindow } from "../types";
import { diskTone, DisksPanel } from "./DisksPanel";
import { ServerProcessesPanel } from "./ServerProcessesPanel";
import { SystemInfoPanel } from "./SystemInfoPanel";

const WINDOWS: MetricsWindow[] = ["now", "1h", "6h", "12h", "24h"];
const PERIOD_KEY = "kubek:monitoring-window";
// Points in the stat sparkline, a couple of minutes of live samples
const SPARK_POINTS = 24;

const readPeriod = (): MetricsWindow => {
  try {
    const saved = localStorage.getItem(PERIOD_KEY) as MetricsWindow | null;
    return saved && WINDOWS.includes(saved) ? saved : "now";
  } catch {
    return "now";
  }
};

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0);

function useSeries(period: MetricsWindow) {
  const liveCpu = useHostMetrics((s) => s.cpuHistory);
  const liveRam = useHostMetrics((s) => s.ramHistory);
  // History is fetched only for a past period, the live buffer always runs
  const history = useMetricsHistoryQuery(period === "now" ? undefined : "system", period);

  return useMemo(() => {
    if (period === "now") return { cpu: liveCpu, ram: liveRam };
    const points = history.data ?? [];
    return {
      cpu: points.map((p) => p.cpu),
      ram: points.map((p) => (p.ramTotal ? (p.ramUsed / p.ramTotal) * 100 : 0)),
    };
  }, [period, liveCpu, liveRam, history.data]);
}

function ResourceChart({ period }: { period: MetricsWindow }) {
  const { t } = useTranslation("modules.systemMonitoring.chart");
  const { cpu, ram } = useSeries(period);
  const live = period === "now";
  const current = (data: number[]) => Math.round(data.at(-1) ?? 0);

  return (
    <Panel>
      <PanelHead>
        <Plate tone="blue" size="sm">
          <Activity />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
        <PanelMeta className="truncate max-sm:hidden">{t("description")}</PanelMeta>
      </PanelHead>
      <PanelBody className="flex min-h-[300px] flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted-foreground">
          <span className={toneClass.purple}>
            <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-tone align-[-1px]" />
            {t("cpu")} <b className="font-semibold text-foreground tabular-nums">{current(cpu)}%</b>
          </span>
          <span className={toneClass.pink}>
            <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-tone align-[-1px]" />
            {t("ram")} <b className="font-semibold text-foreground tabular-nums">{current(ram)}%</b>
          </span>
          <span className="ml-auto">{live ? t("live") : t("average", average(cpu), average(ram))}</span>
        </div>
        <AreaChart
          grid
          className="min-h-[220px] flex-1"
          series={[
            { data: ram, tone: "pink" },
            { data: cpu, tone: "purple" },
          ]}
          renderTooltip={(index) => (
            <span className="tabular-nums">
              {t("cpu")} {Math.round(cpu[index] ?? 0)}% · {t("ram")} {Math.round(ram[index] ?? 0)}%
            </span>
          )}
        />
        <div className="flex justify-between text-[11.5px] text-muted-foreground">
          <span>{t(`start.${period}`)}</span>
          <span>{t("now")}</span>
        </div>
      </PanelBody>
    </Panel>
  );
}

export function SystemMonitoringDashboard() {
  const { t } = useTranslation("modules.systemMonitoring");
  const query = useSystemMonitoringQuery();
  const cpuHistory = useHostMetrics((s) => s.cpuHistory);
  const [period, setPeriod] = useState<MetricsWindow>(readPeriod);

  const changePeriod = (next: MetricsWindow) => {
    setPeriod(next);
    try {
      localStorage.setItem(PERIOD_KEY, next);
    } catch {
      // Remembering the period is a convenience only
    }
  };

  const data = query.data;
  const disks = data?.diskInfo ?? [];
  const diskUsed = disks.reduce((sum, d) => sum + d.used, 0);
  const diskTotal = disks.reduce((sum, d) => sum + d.total, 0);
  const diskPercent = diskTotal ? Math.round((diskUsed / diskTotal) * 100) : 0;

  return (
    <div className="stagger-enter">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ToggleGroup variant="segmented" value={[period]} onValueChange={(next) => next[0] && changePeriod(next[0] as MetricsWindow)} aria-label={t("window.label")}>
            {WINDOWS.map((key) => (
              <Toggle key={key} variant="segmented" value={key}>
                {t(`window.${key}`)}
              </Toggle>
            ))}
          </ToggleGroup>
        }
      />

      {query.isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle />
            </EmptyMedia>
            <EmptyTitle>{t("loadError")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : !data ? (
        <div className="grid gap-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-4">
          <StatStrip>
            <Stat label={t("stats.cpu")} icon={<Cpu />} tone="purple" value={Math.round(data.cpuUsage.cpu ?? 0)} unit="%">
              <Sparkline data={cpuHistory.slice(-SPARK_POINTS)} tone="purple" />
            </Stat>
            <Stat label={t("stats.ram")} icon={<Activity />} tone="pink" value={formatBytes(data.ramUsage.total - data.ramUsage.available)} unit={` / ${formatBytes(data.ramUsage.total)}`}>
              <Meter value={data.ramUsage.percentage} tone="pink" size="md" thresholds className="flex-1" aria-label={t("stats.ram")} />
              <span className="tabular-nums">{Math.round(data.ramUsage.percentage)}%</span>
            </Stat>
            <Stat label={t("stats.disks")} icon={<HardDrive />} tone="amber" value={formatBytes(diskUsed)} unit={` / ${formatBytes(diskTotal)}`}>
              <Meter value={diskPercent} tone={diskTone(diskPercent)} size="md" className="flex-1" aria-label={t("stats.disks")} />
              <span className="tabular-nums">{diskPercent}%</span>
            </Stat>
          </StatStrip>

          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <ResourceChart period={period} />
            <SystemInfoPanel data={data} />
          </div>

          <ServerProcessesPanel />

          <DisksPanel disks={disks} />
        </div>
      )}
    </div>
  );
}
