"use client";
import type { CombinedMonitoringData } from "@/api";
import { useKubekVersionQuery } from "@/modules/settings/api/about.queries";
import { formatVersion } from "@/modules/settings/ui/about/version";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { formatDuration } from "@/shared/lib/formatDuration";
import { Panel, PanelHead, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { toneClass, type Tone } from "@/shared/ui/tone";
import { Activity, Box, Clock, Container, Cpu, Globe, Layers, Server, Tag, type LucideIcon } from "lucide-react";

const PLATFORMS: Record<string, string> = { linux: "Linux", darwin: "macOS", win32: "Windows", freebsd: "FreeBSD" };

interface Row {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  mono?: boolean;
}

export function SystemInfoPanel({ data }: { data: CombinedMonitoringData }) {
  const { t } = useTranslation("modules.systemMonitoring.systemInfo");
  const { t: tc } = useTranslation("modules.components");
  const { data: version } = useKubekVersionQuery();
  const { systemInfo: info, ramUsage: ram } = data;

  const rows: Row[] = [
    { icon: Globe, tone: "blue", label: t("hostname"), value: info.hostname, mono: true },
    { icon: Server, tone: "gray", label: t("platform"), value: PLATFORMS[info.platform] ?? info.platform },
    { icon: Cpu, tone: "purple", label: t("arch"), value: info.arch, mono: true },
    { icon: Tag, tone: "gray", label: t("release"), value: info.release, mono: true },
    { icon: Cpu, tone: "purple", label: t("cpuModel"), value: info.cpus[0]?.trim() || "—" },
    { icon: Layers, tone: "purple", label: t("cpuThreads"), value: String(info.cpus.length) },
    {
      icon: Activity,
      tone: "pink",
      label: t("memory"),
      value: ram.swapTotal ? t("memoryWithSwap", formatBytes(ram.total), formatBytes(ram.swapTotal)) : formatBytes(ram.total),
    },
    { icon: Clock, tone: "cyan", label: t("uptime"), value: formatDuration(info.uptime, tc) },
    { icon: Container, tone: "blue", label: "Docker", value: info.dockerAvailable ? t("available") : t("unavailable") },
    { icon: Box, tone: "green", label: "Kubek", value: version ? formatVersion(version) : "—", mono: true },
  ];

  return (
    <Panel>
      <PanelHead>
        <Plate tone="gray" size="sm">
          <Server />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
      </PanelHead>
      <dl className="m-0 divide-y divide-border">
        {rows.map(({ icon: Icon, tone, label, value, mono }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-[9px] text-[13px]">
            <Icon className={cn("size-3.5 shrink-0 text-tone", toneClass[tone])} />
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd title={value} className={cn("m-0 ml-auto min-w-0 truncate text-right font-medium", mono && "font-mono text-xs")}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
