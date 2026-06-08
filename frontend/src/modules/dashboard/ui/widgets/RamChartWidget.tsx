"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { useSystemMonitoringQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { MemoryStick } from "lucide-react";
import DashboardResourceCard from "./DashboardResourceCard";

export default function RamChartWidget() {
  const { t } = useTranslation("modules.systemMonitoring");
  const { data } = useSystemMonitoringQuery();
  const ramUsage = data?.ramUsage ?? null;

  const total = ramUsage?.total ?? 0;
  const used = ramUsage ? ramUsage.total - ramUsage.available : 0;
  const subLabel = total > 0 ? `${ formatBytes(used) } / ${ formatBytes(total) }` : undefined;

  return (
    <DashboardResourceCard
      kicker={ t("ram.memoryUsage") }
      title={ t("ram.title") }
      icon={ MemoryStick }
      color="blue"
      toValue={ (p) => (p.ramTotal > 0 ? (p.ramUsed / p.ramTotal) * 100 : 0) }
      currentValue={ ramUsage?.percentage ?? null }
      currentSubLabel={ subLabel }
      stroke="#3b82f6"
      bottomFromClass="from-blue-500/20"
      bottomBarClass="bg-blue-500"
      formatValue={ (pct, point) => {
        const tBytes = point?.ramTotal ?? total;
        const uBytes = point?.ramUsed ?? (tBytes > 0 ? (pct / 100) * tBytes : 0);
        return `${ pct.toFixed(1) }%  ·  ${ formatBytes(uBytes) }`;
      } }
    />
  );
}
