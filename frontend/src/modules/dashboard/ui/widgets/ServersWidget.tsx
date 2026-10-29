"use client";
import { useAccess } from "@/shared/lib/access";
import { AccessArea } from "@shared/access/areas";
import type { ServerProcessStats } from "@/api";
import { resolveServerStatus, useAllServerStatuses, useServerFoldersQuery, useServerStore, type Server, type ServerStatusData } from "@/modules/server";
import { useServerStatsQuery } from "@/modules/server/api/server-stats.queries";
import { formatCpu, formatMemory } from "@/modules/server/lib/process-stats";
import { useLanguageContext } from "@/shared/context/language-context";
import { useServerActions } from "@/modules/server/hooks/useServerActions";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { formatPlayers, isOffline, statusTextTone, useServerMeta } from "@/modules/server/hooks/useServerMeta";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Meter } from "@/shared/ui/meter";
import { StatusDot } from "@/shared/ui/status-dot";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { ServerStatus } from "@shared/types/server/server.types";
import { Play, RotateCw, Server as ServerIcon, Terminal } from "lucide-react";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { formatDuration, secondsSince } from "@/shared/lib/formatDuration";
import { WidgetActions, WidgetMeta } from "../WidgetActions";

type Filter = "all" | "running" | "offline";

export default function ServersWidget() {
  const { t } = useTranslation("modules.dashboard.servers");
  const { servers } = useServerStore();
  const statuses = useAllServerStatuses();
  const { enabled: showUsage, stats } = useServerStatsQuery();
  const { data: folders } = useServerFoldersQuery();
  const folderNames = useMemo(() => new Map((folders ?? []).map((folder) => [folder.id, folder.name])), [folders]);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (filter === "all") return servers;
    return servers.filter((server) => {
      const running = resolveServerStatus(statuses[server.id], server.status) === ServerStatus.RUNNING;
      return filter === "running" ? running : !running;
    });
  }, [servers, statuses, filter]);

  return (
    <>
      <WidgetMeta>{servers.length}</WidgetMeta>
      <WidgetActions>
        <ToggleGroup variant="segmented" value={[filter]} onValueChange={(next) => next[0] && setFilter(next[0] as Filter)} aria-label={t("filter.label")}>
          <Toggle variant="segmented" value="all">{t("filter.all")}</Toggle>
          <Toggle variant="segmented" value="running">{t("filter.running")}</Toggle>
          <Toggle variant="segmented" value="offline">{t("filter.offline")}</Toggle>
        </ToggleGroup>
      </WidgetActions>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerIcon />
            </EmptyMedia>
            <EmptyTitle>{servers.length === 0 ? t("empty") : t("emptyFiltered")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("columns.server")}</TableHead>
              <TableHead className="w-36">{t("columns.status")}</TableHead>
              <TableHead className="hidden w-44 @3xl/table:table-cell">{t("columns.type")}</TableHead>
              <TableHead className="hidden w-40 @xl/table:table-cell">{t("columns.players")}</TableHead>
              {showUsage && (
                <>
                  <TableHead className="hidden w-20 text-right @4xl/table:table-cell">{t("columns.cpu")}</TableHead>
                  <TableHead className="hidden w-32 text-right @4xl/table:table-cell">{t("columns.ram")}</TableHead>
                </>
              )}
              <TableHead className="hidden w-24 text-right @2xl/table:table-cell">{t("columns.uptime")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((server) => (
              <ServerRow
                key={server.id}
                server={server}
                live={statuses[server.id]}
                stats={stats.get(server.id)}
                showUsage={showUsage}
                folder={server.folderId ? folderNames.get(server.folderId) : undefined}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

type ServerRowProps = {
  server: Server;
  live?: ServerStatusData;
  stats?: ServerProcessStats;
  showUsage: boolean;
  folder?: string;
};

const ServerRow = memo(function ServerRow({ server, live, stats, showUsage, folder }: ServerRowProps) {
  const { t } = useTranslation("modules.dashboard");
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const { t: tComponents } = useTranslation("modules.components");
  const { language } = useLanguageContext();
  const { selectedServer, selectServer } = useServerStore();
  const meta = useServerMeta(server, live);
  const { perform, pending } = useServerActions(server.id);
  const canControl = useAccess([AccessArea.POWER, "write"], server.id);
  const canConsole = useAccess([AccessArea.CONSOLE, "read"], server.id);
  const fill = meta.players?.max ? (meta.players.online / meta.players.max) * 100 : 0;
  // A stopped server can still have the last sample cached for a few seconds
  const usage = isOffline(meta.status) ? undefined : stats;
  const memory = formatMemory(usage, language);

  return (
    <TableRow
      tabIndex={0}
      data-state={selectedServer?.id === server.id ? "selected" : undefined}
      onClick={() => selectServer(server.id)}
      onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && selectServer(server.id)}
      className="h-14 cursor-pointer outline-none focus-visible:bg-hover"
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <ServerAvatar serverId={server.id} name={server.name} />
          <div className="min-w-0 leading-tight">
            <b className="block truncate text-[13.5px] font-semibold">{server.name}</b>
            {folder && <span className="block truncate text-xs text-muted-foreground">{folder}</span>}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className={cn("inline-flex items-center gap-2 text-[12.5px] font-medium", statusTextTone[meta.status])}>
          <StatusDot status={meta.status} />
          {tStatus(meta.status)}
        </span>
      </TableCell>
      <TableCell className="hidden @3xl/table:table-cell">
        <span className="flex gap-1">
          {meta.coreLabel && <Badge variant="secondary">{meta.coreLabel}</Badge>}
          {meta.version && <Badge variant="info">{meta.version}</Badge>}
        </span>
      </TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        {meta.players ? (
          <div className="grid gap-1.5 text-[12.5px] tabular-nums">
            {formatPlayers(meta.players)}
            {meta.players.max ? <Meter value={fill} tone="blue" aria-label={t("servers.columns.players")} /> : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      {showUsage && (
        <>
          <TableCell
            className={cn(
              "hidden text-right text-[12.5px] tabular-nums @4xl/table:table-cell",
              !usage && "text-muted-foreground",
              meta.status === ServerStatus.STARTING && "text-warn"
            )}
          >
            {formatCpu(usage)}
          </TableCell>
          <TableCell className={cn("hidden text-right text-[12.5px] tabular-nums @4xl/table:table-cell", !memory && "text-muted-foreground")}>
            {memory ? (memory.limit ? t("servers.memory", memory.used, memory.limit) : t("servers.memoryUsed", memory.used)) : "—"}
          </TableCell>
        </>
      )}
      <TableCell className="hidden text-right text-[12.5px] text-muted-foreground tabular-nums @2xl/table:table-cell">
        {meta.running ? formatDuration(secondsSince(usage?.startedAt ?? live?.runtime?.startedAt), tComponents) : "—"}
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <span className="flex justify-end gap-0.5">
          {!canControl ? null : meta.running ? (
            <Button variant="ghost" size="icon-sm" disabled={pending !== null} onClick={() => perform("restart")} aria-label={t("servers.restart")} title={t("servers.restart")}>
              <RotateCw />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:text-success"
              disabled={pending !== null || !isOffline(meta.status)}
              onClick={() => perform("start")}
              aria-label={t("servers.start")}
              title={t("servers.start")}
            >
              <Play />
            </Button>
          )}
          {canConsole && (
            <Link
              href="/console"
              onClick={() => selectServer(server.id)}
              aria-label={t("servers.console")}
              title={t("servers.console")}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <Terminal />
            </Link>
          )}
        </span>
      </TableCell>
    </TableRow>
  );
});
