"use client";
import { useHostMetrics } from "@/modules/system-monitoring/store/host-metrics.store";
import { useAccess } from "@/shared/lib/access";
import { AccessArea } from "@shared/access/areas";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { bytesToGB } from "@/shared/lib/bytesToGb";
import { Sparkline } from "@/shared/ui/area-chart";
import { Meter } from "@/shared/ui/meter";
import { PlayerHead } from "@/shared/ui/player-head";
import { Stat, StatStrip } from "@/shared/ui/stat-strip";
import { StatusDot } from "@/shared/ui/status-dot";
import { ServerStatus } from "@shared/types/server/server.types";
import { Activity, Box, Cpu, Users } from "lucide-react";
import { useServersSummary } from "../hooks/useServersSummary";

function HostStats() {
  const { t } = useTranslation("modules.dashboard.overview");
  const cpu = useHostMetrics((s) => s.cpu);
  const cpuHistory = useHostMetrics((s) => s.cpuHistory);
  const ramUsed = useHostMetrics((s) => s.ramUsed);
  const ramTotal = useHostMetrics((s) => s.ramTotal);
  const ramPercent = ramTotal ? (ramUsed / ramTotal) * 100 : 0;

  return (
    <>
      <Stat label={t("cpu")} icon={<Cpu />} tone="purple" value={Math.round(cpu)} unit="%">
        <Sparkline data={cpuHistory.slice(-24)} tone="purple" />
      </Stat>
      <Stat label={t("ram")} icon={<Activity />} tone="pink" value={bytesToGB(ramUsed)} unit={` / ${bytesToGB(ramTotal)} GB`}>
        <Meter value={ramPercent} tone="pink" size="md" thresholds className="flex-1" aria-label={t("ram")} />
        <span className="tabular-nums">{Math.round(ramPercent)}%</span>
      </Stat>
    </>
  );
}

export default function DashboardStats() {
  const { t } = useTranslation("modules.dashboard.overview");
  const summary = useServersSummary();
  const extraPlayers = summary.players - summary.sampleNames.length;
  const canMonitor = useAccess([AccessArea.MONITORING, "read"]);

  return (
    <StatStrip aria-label={t("title")}>
      <Stat label={t("serversOnline")} icon={<Box />} tone="green" value={summary.running} unit={` / ${summary.total}`}>
        {summary.starting > 0 && (
          <>
            <StatusDot status={ServerStatus.STARTING} />
            {t("starting", summary.starting)}
          </>
        )}
      </Stat>
      <Stat label={t("players")} icon={<Users />} tone="blue" value={summary.players}>
        {summary.sampleNames.length > 0 && (
          <span className="flex">
            {summary.sampleNames.map((name) => (
              <PlayerHead key={name} name={name} size={20} className="-ml-1.5 box-content border-2 border-card first:ml-0" />
            ))}
          </span>
        )}
        {extraPlayers > 0 && <span>+{extraPlayers}</span>}
      </Stat>
      {canMonitor && <HostStats />}
    </StatStrip>
  );
}
