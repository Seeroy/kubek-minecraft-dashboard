"use client";

import type { CompanionStats } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { Meter } from "@/shared/ui/meter";
import { Stat, StatStrip } from "@/shared/ui/stat-strip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { ReactNode } from "react";
import { CircleHelp, Gauge, MemoryStick, Timer, Trash2, UsersRound } from "lucide-react";
import { fixed, msptTone, tpsTone } from "../../lib/health";

function Hint({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex cursor-help items-center gap-1" />}>{children}</TooltipTrigger>
      <TooltipContent className="max-w-72 leading-snug">{hint}</TooltipContent>
    </Tooltip>
  );
}

function HintLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <Hint hint={hint}>
      {label}
      <CircleHelp className="size-3.5 opacity-60" />
    </Hint>
  );
}

/** Last snapshot, every value is a dash until the plugin reports */
export function PerformanceStats({ stats }: { stats: CompanionStats | null }) {
  const { t } = useTranslation("modules.companion.performance.stats");
  const tps = stats?.tps;
  const mspt = stats?.mspt;
  const heap = stats?.jvm;
  const heapPercent = heap && heap.heapMax > 0 ? (heap.heapUsed / heap.heapMax) * 100 : 0;
  const gc = stats?.jvm.gc;

  return (
    <StatStrip className="max-sm:grid-cols-2 max-sm:*:data-[slot=stat]:p-3 max-sm:**:data-[slot=stat-value]:text-xl">
      <Stat label={<HintLabel label={t("tps")} hint={t("hints.tps")} />} icon={<Gauge />} tone={tpsTone(tps?.[0])} value={fixed(tps?.[0], 2)}>
        {tps && t("tpsAverages", fixed(tps[1], 1), fixed(tps[2], 1))}
      </Stat>
      <Stat label={<HintLabel label={t("mspt")} hint={t("hints.mspt")} />} icon={<Timer />} tone={msptTone(mspt?.avg)} value={fixed(mspt?.avg)} unit={mspt ? " ms" : undefined}>
        {mspt &&
          (mspt.p95 != null ? (
            <Hint hint={t("hints.msptDetail")}>
              <span className="underline decoration-dotted underline-offset-2">{t("msptP95", fixed(mspt.p95), fixed(mspt.max))}</span>
            </Hint>
          ) : (
            t("msptEstimate")
          ))}
      </Stat>
      <Stat label={t("heap")} icon={<MemoryStick />} tone="pink" value={heap ? formatBytes(heap.heapUsed) : "—"} unit={heap ? ` / ${formatBytes(heap.heapMax)}` : undefined}>
        {heap && (
          <>
            <Meter value={heapPercent} tone="pink" size="md" thresholds className="flex-1" aria-label={t("heap")} />
            <span className="tabular-nums">{Math.round(heapPercent)}%</span>
          </>
        )}
      </Stat>
      <Stat label={t("players")} icon={<UsersRound />} tone="green" value={stats?.online ?? "—"} unit={stats ? ` / ${stats.maxPlayers}` : undefined} />
      <Stat label={<HintLabel label={t("gc")} hint={t("hints.gc")} />} icon={<Trash2 />} tone="cyan" value={gc ? (gc.pauses ?? gc.count) : "—"}>
        {gc && t("gcDetail", gc.pauseMs ?? gc.timeMs, gc.maxPauseMs ?? 0)}
      </Stat>
    </StatStrip>
  );
}
