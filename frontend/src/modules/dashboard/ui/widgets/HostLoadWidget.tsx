"use client";
import { useMetricsHistoryQuery } from "@/modules/system-monitoring/api/metrics-history.queries";
import { useHostMetrics } from "@/modules/system-monitoring/store/host-metrics.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { AreaChart } from "@/shared/ui/area-chart";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { toneClass } from "@/shared/ui/tone";
import { useMemo, useState } from "react";
import { WidgetActions } from "../WidgetActions";

type Range = "live" | "1h" | "24h";

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function useLoadSeries(range: Range) {
  const liveCpu = useHostMetrics((s) => s.cpuHistory);
  const liveRam = useHostMetrics((s) => s.ramHistory);
  // History is fetched only for the chosen window, the live buffer is always there
  const history = useMetricsHistoryQuery(range === "live" ? undefined : "system", range === "live" ? "1h" : range);

  return useMemo(() => {
    if (range === "live") return { cpu: liveCpu, ram: liveRam };
    const points = history.data ?? [];
    return {
      cpu: points.map((p) => p.cpu),
      ram: points.map((p) => (p.ramTotal ? (p.ramUsed / p.ramTotal) * 100 : 0)),
    };
  }, [range, liveCpu, liveRam, history.data]);
}

export default function HostLoadWidget() {
  const { t } = useTranslation("modules.dashboard.hostLoad");
  const [range, setRange] = useState<Range>("live");
  const { cpu, ram } = useLoadSeries(range);
  const value = (data: number[]) => Math.round((range === "live" ? data.at(-1) : average(data)) ?? 0);

  return (
    <div className="flex h-full min-h-[220px] flex-col gap-3">
      <WidgetActions>
        <ToggleGroup variant="segmented" value={[range]} onValueChange={(next) => next[0] && setRange(next[0] as Range)} aria-label={t("range")}>
          <Toggle variant="segmented" value="live">Live</Toggle>
          <Toggle variant="segmented" value="1h">{t("hour")}</Toggle>
          <Toggle variant="segmented" value="24h">{t("day")}</Toggle>
        </ToggleGroup>
      </WidgetActions>

      <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted-foreground">
        <span className={toneClass.purple}>
          <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-tone align-[-1px]" />
          CPU <b className="font-semibold text-foreground tabular-nums">{value(cpu)}%</b>
        </span>
        <span className={toneClass.pink}>
          <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-tone align-[-1px]" />
          RAM <b className="font-semibold text-foreground tabular-nums">{value(ram)}%</b>
        </span>
        <span className="ml-auto">{t(`note.${range}`)}</span>
      </div>

      <AreaChart
        grid
        className="min-h-0 flex-1"
        series={[
          { data: ram, tone: "pink" },
          { data: cpu, tone: "purple" },
        ]}
        renderTooltip={(index) => (
          <span className="tabular-nums">
            CPU {Math.round(cpu[index] ?? 0)}% · RAM {Math.round(ram[index] ?? 0)}%
          </span>
        )}
      />

      <div className="flex justify-between text-[11.5px] text-muted-foreground">
        <span>{t(`start.${range}`)}</span>
        <span>{t("now")}</span>
      </div>
    </div>
  );
}
