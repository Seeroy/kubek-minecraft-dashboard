"use client";

import type { ServerProcessStats } from "@/api";
import { resolveServerStatus, type Server, type ServerStatusData } from "@/modules/server";
import { ServerStatus } from "@shared/types/server/server.types";
import { useServerStatsQuery } from "@/modules/server/api/server-stats.queries";
import { formatCpu, formatMemory } from "@/modules/server/lib/process-stats";
import { useLanguageContext } from "@/shared/context/language-context";
import { formatDuration, secondsSince } from "@/shared/lib/formatDuration";
import { Meter } from "@/shared/ui/meter";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { NetworkBadge } from "@/modules/networks/ui/NetworkBadge";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Progress } from "@/shared/ui/progress";
import { StatusDot } from "@/shared/ui/status-dot";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { memo, useMemo, useState, type ReactNode } from "react";
import { ServerActionsMenu } from "./ServerActionsMenu";
import { formatPlayers, isOffline, statusTextTone, useServerMeta } from "@/modules/server/hooks/useServerMeta";
import { useServerItem } from "./useServerItem";

type SortKey = "name" | "status" | "players" | "cpu" | "ram";
type Sort = { key: SortKey; dir: 1 | -1 } | null;

const STATUS_ORDER: Record<ServerStatus, number> = {
  [ServerStatus.RUNNING]: 0,
  [ServerStatus.STARTING]: 1,
  [ServerStatus.STOPPING]: 2,
  [ServerStatus.CRASHED]: 3,
  [ServerStatus.STOPPED]: 4,
};

function sortServers(servers: Server[], statuses: Record<string, ServerStatusData>, stats: Map<string, ServerProcessStats>, sort: Sort) {
  if (!sort) return servers;
  const value = (server: Server): string | number => {
    const live = statuses[server.id];
    if (sort.key === "name") return server.name.toLowerCase();
    if (sort.key === "status") return STATUS_ORDER[resolveServerStatus(live, server.status)];
    if (sort.key === "cpu") return stats.get(server.id)?.cpu ?? -1;
    if (sort.key === "ram") return stats.get(server.id)?.memoryBytes ?? -1;
    return live?.players?.online ?? live?.runtime?.playersOnline ?? -1;
  };
  return [...servers].sort((a, b) => (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0) * sort.dir);
}

function SortButton({ label, sortKey, sort, onSort }: { label: ReactNode; sortKey: SortKey; sort: Sort; onSort: (key: SortKey) => void }) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === 1 ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      data-active={active || undefined}
      className="inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 data-active:text-foreground"
    >
      {label}
      <Icon className="size-3" />
    </button>
  );
}

export function ServersTable({ servers, statuses }: { servers: Server[]; statuses: Record<string, ServerStatusData> }) {
  const { t } = useTranslation("modules.sidebar.serversList.table");
  const { enabled: showUsage, stats } = useServerStatsQuery();
  const [sort, setSort] = useState<Sort>(null);
  const rows = useMemo(() => sortServers(servers, statuses, stats, sort), [servers, statuses, stats, sort]);

  const onSort = (key: SortKey) =>
    setSort((current) => (current?.key !== key ? { key, dir: 1 } : current.dir === 1 ? { key, dir: -1 } : null));

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <SortButton label={t("server")} sortKey="name" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="w-36">
              <SortButton label={t("status")} sortKey="status" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="hidden w-44 @2xl/table:table-cell">{t("type")}</TableHead>
            <TableHead className="hidden w-32 @xl/table:table-cell">
              <SortButton label={t("players")} sortKey="players" sort={sort} onSort={onSort} />
            </TableHead>
            {showUsage && (
              <>
                <TableHead className="hidden w-20 text-right @3xl/table:table-cell">
                  <SortButton label={t("cpu")} sortKey="cpu" sort={sort} onSort={onSort} />
                </TableHead>
                <TableHead className="hidden w-32 text-right @3xl/table:table-cell">
                  <SortButton label={t("ram")} sortKey="ram" sort={sort} onSort={onSort} />
                </TableHead>
              </>
            )}
            <TableHead className="hidden w-24 text-right @4xl/table:table-cell">{t("uptime")}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((server) => (
            <ServerRow key={server.id} server={server} live={statuses[server.id]} stats={stats.get(server.id)} showUsage={showUsage} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type ServerRowProps = {
  server: Server;
  live?: ServerStatusData;
  stats?: ServerProcessStats;
  showUsage: boolean;
};

const ServerRow = memo(function ServerRow({ server, live, stats, showUsage }: ServerRowProps) {
  const { t } = useTranslation("modules.sidebar.serversList.table");
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const { t: tComponents } = useTranslation("modules.components");
  const { language } = useLanguageContext();
  const meta = useServerMeta(server, live);
  const item = useServerItem(server);
  const usage = isOffline(meta.status) ? undefined : stats;
  const memory = formatMemory(usage, language);
  const fill = meta.players?.max ? (meta.players.online / meta.players.max) * 100 : 0;
  const subtitle = [meta.coreLabel, meta.version].filter(Boolean).join(" ");

  return (
    <TableRow
      data-state={item.checked || item.current ? "selected" : undefined}
      data-interactive={!item.creating || undefined}
      {...item.interactive}
      className="h-[52px] outline-none focus-visible:bg-hover data-interactive:cursor-pointer"
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-2.5">
          {item.selectionMode && !item.creating && (
            <Checkbox checked={item.checked} onCheckedChange={item.toggle} onClick={(event) => event.stopPropagation()} aria-label={server.name} />
          )}
          <ServerAvatar serverId={server.id} name={server.name} />
          <div className="min-w-0">
            <b className="block max-w-64 truncate text-[13.5px] font-semibold">{server.name}</b>
            {/* The type column takes over on wide tables */}
            {subtitle && <span className="block truncate text-xs text-muted-foreground @2xl/table:hidden">{subtitle}</span>}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {item.creating ? (
          <Progress value={item.creating.progress} className="w-28" />
        ) : (
          <span className={cn("inline-flex items-center gap-2 text-[12.5px] font-medium", statusTextTone[meta.status])}>
            <StatusDot status={meta.status} />
            {tStatus(meta.status)}
          </span>
        )}
      </TableCell>
      <TableCell className="hidden @2xl/table:table-cell">
        <span className="flex gap-1">
          {meta.coreLabel && <Badge variant="secondary">{meta.coreLabel}</Badge>}
          {meta.version && <Badge variant="info">{meta.version}</Badge>}
          <NetworkBadge serverId={server.id} />
        </span>
      </TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        {meta.players ? (
          <div className="grid gap-1.5 pr-3 text-[12.5px] tabular-nums">
            {formatPlayers(meta.players)}
            {meta.players.max ? <Meter value={fill} tone="blue" aria-label={t("players")} /> : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      {showUsage && (
        <>
          <TableCell className={cn("hidden text-right text-[12.5px] tabular-nums @3xl/table:table-cell", !usage && "text-muted-foreground")}>
            {formatCpu(usage)}
          </TableCell>
          <TableCell className={cn("hidden text-right text-[12.5px] tabular-nums @3xl/table:table-cell", !memory && "text-muted-foreground")}>
            {memory ? (memory.limit ? t("memory", memory.used, memory.limit) : t("memoryUsed", memory.used)) : "—"}
          </TableCell>
        </>
      )}
      <TableCell className="hidden text-right text-[12.5px] text-muted-foreground tabular-nums @4xl/table:table-cell">
        {meta.running ? formatDuration(secondsSince(usage?.startedAt ?? live?.runtime?.startedAt), tComponents) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {!item.creating && !item.selectionMode && <ServerActionsMenu server={server} />}
      </TableCell>
    </TableRow>
  );
});
