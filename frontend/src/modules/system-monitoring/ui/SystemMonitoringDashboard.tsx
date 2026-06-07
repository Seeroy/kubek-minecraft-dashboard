"use client";
import { useLiveMetricsBuffer } from "@/modules/system-monitoring/hooks/useLiveMetricsBuffer";
import type { MetricsWindow } from "@/modules/system-monitoring/types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { useSystemMonitoringQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { PageError } from "@/shared/ui/PageError";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageLoading } from "@/shared/ui/PageLoading";
import { Activity, Cpu, MemoryStick } from "lucide-react";
import { useState } from "react";
import { DiskUsageCard } from "./DiskUsageCard";
import ResourceChartCard from "./ResourceChartCard";
import { SystemInfoCard } from "./SystemInfoCard";
import TimeRangeSelector from "./TimeRangeSelector";

export function SystemMonitoringDashboard() {
  const { t } = useTranslation("modules.systemMonitoring");
  const query = useSystemMonitoringQuery();
  const live = useLiveMetricsBuffer();
  const [window, setWindow] = useState<MetricsWindow>("now");

  const systemInfo = query.data?.systemInfo || null;
  const diskInfo = query.data?.diskInfo || [];
  const cpuUsage = query.data?.cpuUsage || null;
  const ramUsage = query.data?.ramUsage || null;

  if (query.isLoading) {
    return (
      <PageLayout>
        <BlockHeader
          kicker={t("header.title")}
          title={t("header.title")}
          description={t("header.description")}
          icon={Activity}
          color="red"
        />
        <PageLoading />
      </PageLayout>
    );
  }

  if (query.error) {
    return (
      <PageLayout>
        <BlockHeader
          kicker={t("header.title")}
          title={t("header.title")}
          description={t("header.description")}
          icon={Activity}
          color="red"
        />
        <PageError
          message={`${t("dashboard.loadError")}: ${(query.error as Error).message}`}
        />
      </PageLayout>
    );
  }

  const ramTotal = ramUsage?.total ?? 0;
  const ramUsed = ramUsage ? ramUsage.total - ramUsage.available : 0;
  const ramSubLabel =
    ramTotal > 0
      ? `${formatBytes(ramUsed)} / ${formatBytes(ramTotal)}`
      : undefined;

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("header.title")}
        title={t("header.title")}
        description={t("header.description")}
        icon={Activity}
        color="red"
      />

      <SystemInfoCard systemInfo={systemInfo} />

      <div className="flex items-center justify-end">
        <TimeRangeSelector value={window} onChange={setWindow} />
      </div>

      <ResourceChartCard
        kicker={t("cpu.overallUsage")}
        title={t("cpu.title")}
        icon={Cpu}
        color="purple"
        scope="system"
        window={window}
        toValue={(p) => p.cpu}
        currentValue={cpuUsage?.cpu ?? null}
        stroke="#a855f7"
        bottomFromClass="from-purple-500/20"
        bottomBarClass="bg-purple-500"
        livePoints={live.points}
      />

      <ResourceChartCard
        kicker={t("ram.memoryUsage")}
        title={t("ram.title")}
        icon={MemoryStick}
        color="blue"
        scope="system"
        window={window}
        toValue={(p) => (p.ramTotal > 0 ? (p.ramUsed / p.ramTotal) * 100 : 0)}
        currentValue={ramUsage?.percentage ?? null}
        currentSubLabel={ramSubLabel}
        stroke="#3b82f6"
        bottomFromClass="from-blue-500/20"
        bottomBarClass="bg-blue-500"
        livePoints={live.points}
        formatValue={(pct, point) => {
          const total = point?.ramTotal ?? ramTotal;
          const used = point?.ramUsed ?? (total > 0 ? (pct / 100) * total : 0);
          return `${pct.toFixed(1)}%  ·  ${formatBytes(used)}`;
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {diskInfo.map((disk) => (
          <div key={disk.mount}>
            <DiskUsageCard diskInfo={disk} />
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
