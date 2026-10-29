"use client";
import type { DiskInfo } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Meter } from "@/shared/ui/meter";
import { Panel, PanelFoot, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { toneClass, type Tone } from "@/shared/ui/tone";
import { HardDrive } from "lucide-react";

export const diskTone = (percent: number): Tone => (percent >= 90 ? "red" : percent >= 75 ? "orange" : "amber");

export function DisksPanel({ disks }: { disks: DiskInfo[] }) {
  const { t } = useTranslation("modules.systemMonitoring.disks");
  const used = disks.reduce((sum, d) => sum + d.used, 0);
  const total = disks.reduce((sum, d) => sum + d.total, 0);

  return (
    <Panel>
      <PanelHead>
        <Plate tone="amber" size="sm">
          <HardDrive />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
        <PanelMeta>{disks.length}</PanelMeta>
      </PanelHead>
      {disks.length === 0 ? (
        <p className="p-4 text-[13px] text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex-1 divide-y divide-border">
          {disks.map((disk) => {
            const percent = Math.round(disk.percentage);
            const tone = diskTone(percent);
            return (
              <div key={disk.mount} className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                <Plate tone={tone} size="sm">
                  <HardDrive />
                </Plate>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <b className="truncate font-mono text-[13px] font-semibold">{disk.mount}</b>
                    <span className="truncate text-xs text-muted-foreground">{disk.type}</span>
                  </div>
                  <Meter value={percent} tone={tone} size="md" className="mt-1.5" aria-label={disk.mount} />
                  <div className="mt-1 truncate text-xs text-muted-foreground tabular-nums">
                    {t("usage", formatBytes(disk.used), formatBytes(disk.available), formatBytes(disk.total))}
                  </div>
                </div>
                <span className={cn("text-right text-[13px] font-semibold text-tone tabular-nums", toneClass[tone])}>{percent}%</span>
              </div>
            );
          })}
        </div>
      )}
      {disks.length > 1 && (
        <PanelFoot className="tabular-nums">{t("total", formatBytes(used), formatBytes(total), formatBytes(total - used))}</PanelFoot>
      )}
    </Panel>
  );
}
