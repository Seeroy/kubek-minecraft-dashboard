import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Card, CardContent } from "@/shared/ui/card";
import type { DiskInfo } from "@/api/system-monitoring/system-monitoring.model";
import { HardDrive } from "lucide-react";

interface DiskUsageCardProps {
  diskInfo: DiskInfo;
}

export function DiskUsageCard({ diskInfo }: DiskUsageCardProps) {
  const { t } = useTranslation("modules.systemMonitoring");

  const isCritical = diskInfo.percentage > 90;
  const colorClass = isCritical ? "text-red-500" : "text-green-500";
  const bgClass = isCritical ? "bg-red-500" : "bg-green-500";
  const fromClass = isCritical ? "from-red-500/20" : "from-green-500/20";

  return (
    <Card className="relative overflow-hidden border-none bg-card shadow-md">
      <CardContent className="p-6 pb-8">
        <div className="flex items-start justify-between">
          <div className="relative z-10 space-y-1">
            {/* Percent */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {diskInfo.percentage.toFixed(2)}%
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                / 100%
              </span>
            </div>

            {/* Disk name and usage */}
            <div className="flex flex-col">
              <span className={cn("text-sm font-medium", colorClass)}>
                {diskInfo.mount}
              </span>
              <span className="text-xs text-muted-foreground">
                {humanizeFileSize(diskInfo.used)} {t("disk.used")} /{" "}
                {humanizeFileSize(diskInfo.total)}
              </span>
            </div>
          </div>

          {/* Icon */}
          <div className="rounded-lg bg-green-500/10 p-2">
            <HardDrive className="h-6 w-6 text-green-400" />
          </div>
        </div>

        {/* Background gradient */}
        <div className="absolute right-0 bottom-0 left-0">
          {/* Glow effect */}
          <div
            className={cn(
              "absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t to-transparent transition-[width] duration-500 ease-out",
              fromClass
            )}
            style={{ width: `${diskInfo.percentage}%` }}
          />

          {/* Total track */}
          <div className="h-1 w-full bg-secondary/30" />

          {/* Active line */}
          <div
            className={cn(
              "absolute bottom-0 left-0 h-1 shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-[width] duration-500 ease-out",
              bgClass
            )}
            style={{ width: `${diskInfo.percentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
