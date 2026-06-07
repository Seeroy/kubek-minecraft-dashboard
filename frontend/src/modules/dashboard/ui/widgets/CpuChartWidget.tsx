"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useSystemMonitoringQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { Cpu } from "lucide-react";
import DashboardResourceCard from "./DashboardResourceCard";

export default function CpuChartWidget() {
  const { t } = useTranslation("modules.systemMonitoring");
  const { data } = useSystemMonitoringQuery();
  const current = data?.cpuUsage?.cpu ?? null;

  return (
    <DashboardResourceCard
      kicker={ t("cpu.overallUsage") }
      title={ t("cpu.title") }
      icon={ Cpu }
      color="purple"
      toValue={ (p) => p.cpu }
      currentValue={ current }
      stroke="#a855f7"
      bottomFromClass="from-purple-500/20"
      bottomBarClass="bg-purple-500"
    />
  );
}
