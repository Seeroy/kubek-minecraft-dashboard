"use client";

import { useHostMetrics } from "@/modules/system-monitoring/store/host-metrics.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { bytesToGB } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Meter } from "@/shared/ui/meter";
import { type Tone, toneClass } from "@/shared/ui/tone";

function MetricRow({ label, tone, percent, value }: { label: string; tone: Tone; percent: number; value: string }) {
  return (
    <div className={cn("grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 sidebar-mini:grid-cols-1", toneClass[tone])}>
      <b className="text-[10.5px] font-semibold tracking-[0.06em] text-tone sidebar-mini:hidden">{label}</b>
      <Meter value={percent} tone={tone} size="md" thresholds aria-label={label} />
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums sidebar-mini:hidden">{value}</span>
    </div>
  );
}

export default function HostMetrics() {
  const { t } = useTranslation("modules.sidebar");
  const cpu = useHostMetrics((s) => s.cpu);
  const ramUsed = useHostMetrics((s) => s.ramUsed);
  const ramTotal = useHostMetrics((s) => s.ramTotal);
  const ramPercent = ramTotal ? (ramUsed / ramTotal) * 100 : 0;

  return (
    <div className="grid gap-1.5 px-2 sidebar-mini:px-1.5" title={t("hostMetrics")}>
      <MetricRow label={t("resources.cpu")} tone="purple" percent={cpu} value={`${Math.round(cpu)}%`} />
      <MetricRow
        label={t("resources.ram")}
        tone="pink"
        percent={ramPercent}
        value={`${bytesToGB(ramUsed)}/${bytesToGB(ramTotal)} GB`}
      />
    </div>
  );
}
