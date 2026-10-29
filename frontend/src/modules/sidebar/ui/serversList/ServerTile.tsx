"use client";

import type { Server, ServerStatusData } from "@/modules/server";
import { useServerStatsQuery } from "@/modules/server/api/server-stats.queries";
import { formatCpu, formatMemory, memoryPercent } from "@/modules/server/lib/process-stats";
import { useLanguageContext } from "@/shared/context/language-context";
import { Meter } from "@/shared/ui/meter";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Progress } from "@/shared/ui/progress";
import { StatusDot } from "@/shared/ui/status-dot";
import { Users } from "lucide-react";
import { NetworkBadge } from "@/modules/networks/ui/NetworkBadge";
import { memo } from "react";
import { ServerActionsMenu } from "./ServerActionsMenu";
import { formatPlayers, isOffline, statusTextTone, useServerMeta } from "@/modules/server/hooks/useServerMeta";
import { useServerItem } from "./useServerItem";

export const ServerTile = memo(function ServerTile({ server, live }: { server: Server; live?: ServerStatusData }) {
  const { t } = useTranslation("modules.sidebar.serversList");
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const { language } = useLanguageContext();
  const meta = useServerMeta(server, live);
  const item = useServerItem(server);
  const stats = useServerStatsQuery().stats.get(server.id);
  const usage = isOffline(meta.status) ? undefined : stats;
  const memory = formatMemory(usage, language);

  return (
    <div
      role={item.creating ? undefined : "button"}
      aria-pressed={item.selectionMode ? item.checked : undefined}
      aria-current={item.current || undefined}
      data-checked={item.checked || undefined}
      data-interactive={!item.creating || undefined}
      {...item.interactive}
      className={cn(
        "grid content-start gap-3 rounded-lg border border-border bg-card p-3 transition-[border-color,background-color,translate] duration-150 ease-smooth outline-none",
        "data-interactive:cursor-pointer data-interactive:hover:-translate-y-px data-interactive:hover:border-foreground/20 focus-visible:border-primary/60",
        "aria-[current=true]:border-primary/60 aria-[current=true]:bg-primary/6 data-checked:border-primary/60 data-checked:bg-primary/6"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {item.selectionMode && !item.creating && (
          <Checkbox checked={item.checked} onCheckedChange={item.toggle} onClick={(event) => event.stopPropagation()} aria-label={server.name} />
        )}
        <ServerAvatar serverId={server.id} name={server.name} className="size-9 rounded-md" />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[13.5px] font-semibold">{server.name}</b>
          <span className={cn("block truncate text-xs font-medium", item.creating ? "text-primary" : statusTextTone[meta.status])}>
            {item.creating ? item.creating.message : tStatus(meta.status)}
          </span>
        </div>
        {!item.creating && !item.selectionMode && <ServerActionsMenu server={server} />}
        <StatusDot status={meta.status} />
      </div>

      {item.creating ? (
        <Progress value={item.creating.progress} />
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.version && <Badge variant="info">{meta.version}</Badge>}
          {meta.coreLabel && <Badge variant="secondary">{meta.coreLabel}</Badge>}
          <NetworkBadge serverId={server.id} />
          <Badge variant={meta.running ? "success" : "secondary"}>
            <Users />
            {meta.players ? formatPlayers(meta.players) : t("serverOffline")}
          </Badge>
        </div>
      )}

      {usage && memory && (
        <div className="grid grid-cols-2 gap-3 text-[11.5px] text-muted-foreground tabular-nums">
          <div className="grid gap-1">
            <span className="flex justify-between gap-2">
              {t("table.cpu")}
              <b className="font-medium text-foreground">{formatCpu(usage)}</b>
            </span>
            <Meter value={usage.cpu ?? 0} tone="purple" aria-label={t("table.cpu")} />
          </div>
          <div className="grid gap-1">
            <span className="flex justify-between gap-2">
              {t("table.ram")}
              <b className="truncate font-medium text-foreground">
                {memory.limit ? t("table.memory", memory.used, memory.limit) : t("table.memoryUsed", memory.used)}
              </b>
            </span>
            <Meter value={memoryPercent(usage) ?? 0} tone="pink" thresholds aria-label={t("table.ram")} />
          </div>
        </div>
      )}
    </div>
  );
});
