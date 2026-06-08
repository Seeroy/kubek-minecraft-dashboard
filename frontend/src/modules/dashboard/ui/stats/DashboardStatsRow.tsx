"use client";
import type { Translator } from "@/locales/types";
import { useServerStore } from "@/modules/server";
import { useAllServerStatuses } from "@/modules/server/store/server-statuses.store";
import { useSystemMonitoringQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { ServerStatus } from "@shared/types/server/server.types";
import { UserPermissions } from "@shared/types/user.types";
import { Clock, Cpu, Server, Users } from "lucide-react";
import { useMemo } from "react";
import DashboardStatCard from "./DashboardStatCard";

/** Servers + players cards */
function ServerStatCards() {
  const { t } = useTranslation("modules.dashboard");
  const { servers } = useServerStore();
  const statuses = useAllServerStatuses();

  const { running, total, online, capacity } = useMemo(() => {
    let running = 0;
    let online = 0;
    let capacity = 0;
    for (const server of servers) {
      const live = statuses[server.id];
      if ((live?.status ?? server.status) === ServerStatus.RUNNING) running++;
      online += live?.players?.online ?? 0;
      capacity += live?.players?.max ?? 0;
    }
    return { running, total: servers.length, online, capacity };
  }, [servers, statuses]);

  return (
    <>
      <DashboardStatCard
        kicker={t("overview.servers")}
        value={`${running}/${total}`}
        footer={t("overview.serversRunning")}
        icon={Server}
        accent="emerald"
      />
      <DashboardStatCard
        kicker={t("overview.players")}
        value={online}
        footer={capacity > 0 ? t("overview.playersOf", capacity) : "—"}
        icon={Users}
        accent="blue"
      />
    </>
  );
}

/** Format host uptime into compact localized "Xd Yh" / "Xh Ym" / "Xm" string */
function formatUptime(seconds: number | undefined, t: Translator) {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return t("overview.uptimeDays", d, h);
  if (h > 0) return t("overview.uptimeHours", h, m);
  return t("overview.uptimeMinutes", m);
}

/** CPU + uptime cards mounted only when read host metrics */
function SystemStatCards() {
  const { t } = useTranslation("modules.dashboard");
  const { data, isLoading } = useSystemMonitoringQuery();

  const cpu = data?.cpuUsage?.cpu ?? null;
  const cores = data?.systemInfo?.cpus?.length ?? 0;
  const sys = data?.systemInfo;
  const loading = isLoading && !data;

  return (
    <>
      <DashboardStatCard
        kicker={t("overview.cpu")}
        value={cpu != null ? `${Math.round(cpu)}%` : "—"}
        footer={cores > 0 ? t("overview.cpuCores", cores) : undefined}
        icon={Cpu}
        accent="purple"
        loading={loading}
      />
      <DashboardStatCard
        kicker={t("overview.uptime")}
        value={formatUptime(sys?.uptime, t)}
        footer={sys?.platform ? `${sys.platform} · ${sys.arch}` : undefined}
        icon={Clock}
        accent="amber"
        loading={loading}
      />
    </>
  );
}

export default function DashboardStatsRow() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canMonitor = hasPermission(UserPermissions.SYSTEM_MONITORING);

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <ServerStatCards />
      {canMonitor ? <SystemStatCards /> : null}
    </div>
  );
}
