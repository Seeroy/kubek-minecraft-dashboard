"use client";
import { useSystemMonitoringQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import type { LucideIcon } from "lucide-react";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";

interface MeterProps {
  icon: LucideIcon;
  label: string;
  value: number;
  detail?: string;
  plate: string;
}

function Meter({ icon: Icon, label, value, detail, plate }: MeterProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  // Bar color escalates with load so a hot host is obvious at a glance
  const bar =
    pct >= 90
      ? "from-rose-500 to-red-500"
      : pct >= 70
        ? "from-amber-400 to-orange-500"
        : "from-primary to-primary/70";

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
          plate
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
              bar
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {detail ? (
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function HostResourcesWidget() {
  const { t } = useTranslation("modules.dashboard");
  const { data, isLoading: loading } = useSystemMonitoringQuery();

  if (loading || !data) {
    return <p className="text-sm text-muted-foreground">…</p>;
  }

  const ram = data.ramUsage;
  const disk = data.diskInfo?.[0];

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <Meter
        icon={Cpu}
        label={t("host.cpu")}
        value={data.cpuUsage?.cpu ?? 0}
        plate="bg-purple-500/10 text-purple-400 ring-purple-500/20"
      />
      <Meter
        icon={MemoryStick}
        label={t("host.ram")}
        value={ram?.percentage ?? 0}
        detail={
          ram
            ? `${formatBytes(ram.used)} / ${formatBytes(ram.total)}`
            : undefined
        }
        plate="bg-amber-500/10 text-amber-500 ring-amber-500/20"
      />
      {disk ? (
        <Meter
          icon={HardDrive}
          label={t("host.disk")}
          value={disk.percentage}
          detail={`${formatBytes(disk.used)} / ${formatBytes(disk.total)}`}
          plate="bg-blue-500/10 text-blue-500 ring-blue-500/20"
        />
      ) : null}
    </div>
  );
}
