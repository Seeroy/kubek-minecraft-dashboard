import type { SystemInfo } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent } from "@/shared/ui/card";
import { Clock, Cpu, Globe, Hash, Layers, Monitor, Server } from "lucide-react";

interface SystemInfoCardProps {
  systemInfo: SystemInfo | null;
}

export function SystemInfoCard({ systemInfo }: SystemInfoCardProps) {
  const { t } = useTranslation("modules.systemMonitoring");

  if (!systemInfo) {
    return (
      <Card className="relative flex min-h-[350px] items-center justify-center overflow-hidden border-none bg-card shadow-md">
        <div className="text-muted-foreground">{t("systemInfo.noData")}</div>
      </Card>
    );
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;
  };

  const InfoTile = ({ icon: Icon, label, value, className }: any) => (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border border-border/40 bg-secondary/20 p-3",
        className
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold tracking-wider uppercase">
          {label}
        </span>
      </div>
      <div className="truncate text-sm font-semibold break-all whitespace-normal">
        {value}
      </div>
    </div>
  );

  return (
    <Card className="relative flex flex-col overflow-hidden border-none bg-card shadow-md">
      <CardContent className="flex-1 space-y-6 p-6 pt-1.5 pb-7">
        <BlockHeader
          kicker={t("systemInfo.title")}
          title={systemInfo.hostname}
          icon={Monitor}
          color="blue"
        />

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Uptime - Full width in the grid */}
          <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 sm:col-span-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">
                {t("systemInfo.uptime")}
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-blue-500">
              {formatUptime(systemInfo.uptime)}
            </span>
          </div>

          <InfoTile
            icon={Globe}
            label={t("systemInfo.platform")}
            value={systemInfo.platform}
          />

          <InfoTile
            icon={Layers}
            label={t("systemInfo.architecture")}
            value={systemInfo.arch}
          />

          <InfoTile
            icon={Server}
            label={t("systemInfo.release")}
            value={systemInfo.release}
          />

          <InfoTile
            icon={Hash}
            label={t("systemInfo.cpuCores")}
            value={`${systemInfo.cpus.length} Threads`}
          />

          {/* CPU Model - Spans full width because text is usually long */}
          <InfoTile
            icon={Cpu}
            label={t("systemInfo.cpuModel")}
            value={systemInfo.cpus[0] || "Unknown"}
            className="sm:col-span-2"
          />
        </div>
      </CardContent>

      {/* Bottom Accent Line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="h-1 w-full bg-blue-500 shadow-[0_-2px_10px_rgba(59,130,246,0.3)]" />
      </div>
    </Card>
  );
}
