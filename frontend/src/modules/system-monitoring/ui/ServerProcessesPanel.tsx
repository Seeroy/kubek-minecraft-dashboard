"use client";
import { useAllServerStatuses, useServerStore } from "@/modules/server";
import { useServerStatsQuery } from "@/modules/server/api/server-stats.queries";
import { isOffline, statusTextTone, useServerMeta } from "@/modules/server/hooks/useServerMeta";
import { formatCpu, formatMemory, memoryPercent } from "@/modules/server/lib/process-stats";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import type { Server, ServerStatusData } from "@/modules/server";
import type { ServerProcessStats } from "@/api";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { formatDuration, secondsSince } from "@/shared/lib/formatDuration";
import { Meter } from "@/shared/ui/meter";
import { Panel, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { StatusDot } from "@/shared/ui/status-dot";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Box } from "lucide-react";
import { useMemo, useState } from "react";

type SortKey = "cpu" | "ram";

const sortValue = (stats: ServerProcessStats | undefined, key: SortKey) => (!stats ? -1 : key === "cpu" ? (stats.cpu ?? 0) : stats.memoryBytes);

/** Per-server CPU and memory, running servers first by the chosen metric */
export function ServerProcessesPanel() {
  const { t } = useTranslation("modules.systemMonitoring.processes");
  const { servers } = useServerStore();
  const statuses = useAllServerStatuses();
  const { enabled, stats } = useServerStatsQuery();
  const [sort, setSort] = useState<SortKey>("cpu");

  const rows = useMemo(() => [...servers].sort((a, b) => sortValue(stats.get(b.id), sort) - sortValue(stats.get(a.id), sort)), [servers, stats, sort]);

  // Sampling turned off in settings, nothing to show
  if (!enabled) return null;

  return (
    <Panel>
      <PanelHead className="py-1.5">
        <Plate tone="green" size="sm">
          <Box />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
        <PanelMeta className="truncate max-sm:hidden">{t("description")}</PanelMeta>
        <ToggleGroup
          variant="segmented"
          className="ml-auto"
          value={[sort]}
          onValueChange={(next) => next[0] && setSort(next[0] as SortKey)}
          aria-label={t("sort.label")}
        >
          <Toggle variant="segmented" value="cpu">
            {t("sort.cpu")}
          </Toggle>
          <Toggle variant="segmented" value="ram">
            {t("sort.ram")}
          </Toggle>
        </ToggleGroup>
      </PanelHead>
      {rows.length === 0 ? (
        <p className="p-4 text-[13px] text-muted-foreground">{t("empty")}</p>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("columns.server")}</TableHead>
              <TableHead className="w-36">{t("columns.status")}</TableHead>
              <TableHead className="hidden w-[22%] @2xl/table:table-cell">{t("columns.cpu")}</TableHead>
              <TableHead className="hidden w-[22%] @xl/table:table-cell">{t("columns.ram")}</TableHead>
              <TableHead className="hidden w-24 text-right @3xl/table:table-cell">{t("columns.uptime")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((server) => (
              <ProcessRow key={server.id} server={server} live={statuses[server.id]} stats={stats.get(server.id)} />
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function ProcessRow({ server, live, stats }: { server: Server; live?: ServerStatusData; stats?: ServerProcessStats }) {
  const { t } = useTranslation("modules.systemMonitoring.processes");
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const { t: tComponents } = useTranslation("modules.components");
  const { language } = useLanguageContext();
  const meta = useServerMeta(server, live);
  const usage = isOffline(meta.status) ? undefined : stats;
  const memory = formatMemory(usage, language);
  const ramPercent = memoryPercent(usage);
  const core = [meta.coreLabel, meta.version].filter(Boolean).join(" ");
  const subtitle = [core, usage?.pid && t("pid", usage.pid)].filter(Boolean).join(" · ");

  return (
    <TableRow className="h-14">
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <ServerAvatar serverId={server.id} name={server.name} />
          <div className="min-w-0 leading-tight">
            <b className="block truncate text-[13.5px] font-semibold">{server.name}</b>
            {subtitle && <span className="block truncate text-xs text-muted-foreground tabular-nums">{subtitle}</span>}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className={cn("inline-flex items-center gap-2 text-[12.5px] font-medium", statusTextTone[meta.status])}>
          <StatusDot status={meta.status} />
          {tStatus(meta.status)}
        </span>
      </TableCell>
      <TableCell className="hidden @2xl/table:table-cell">
        {usage ? (
          <div className="grid gap-1.5 pr-4 text-[12.5px] tabular-nums">
            {formatCpu(usage)}
            <Meter value={usage.cpu ?? 0} tone="purple" aria-label={t("columns.cpu")} />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        {memory ? (
          <div className="grid gap-1.5 pr-4 text-[12.5px] tabular-nums">
            <span>
              {memory.used}
              <span className="text-muted-foreground">{memory.limit ? t("memoryLimit", memory.limit) : t("memoryUnit")}</span>
            </span>
            {ramPercent != null && <Meter value={ramPercent} tone="pink" thresholds aria-label={t("columns.ram")} />}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden text-right text-[12.5px] text-muted-foreground tabular-nums @3xl/table:table-cell">
        {meta.running ? formatDuration(secondsSince(usage?.startedAt ?? live?.runtime?.startedAt ?? undefined), tComponents) : "—"}
      </TableCell>
    </TableRow>
  );
}
