"use client";
import { api } from "@/api";
import type { Server, ServerStatusData } from "@/modules/server";
import { ServerStatusIndicator } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import BlobImage from "@/shared/ui/BlobImage";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Card } from "@/shared/ui/card";
import { TooltipButton } from "@/shared/ui/TooltipButton";
import { ServerStatus } from "@shared/types/server/server.types";
import { UserPermissions } from "@shared/types/user.types";
import {
  OctagonX,
  Play,
  RotateCw,
  Server as ServerIcon,
  Square,
  Tag,
  UsersRound,
} from "lucide-react";
import React, { useState } from "react";

interface DashboardServerCardProps {
  server: Server;
  status?: ServerStatusData;
  selected?: boolean;
  onSelect: (id: string) => void;
}

const STATUS_TEXT_CLASS: Record<string, string> = {
  [ServerStatus.RUNNING]: "text-emerald-500 dark:text-emerald-400",
  [ServerStatus.STOPPED]: "text-rose-500 dark:text-rose-400",
  [ServerStatus.STARTING]: "text-amber-500 dark:text-amber-400",
  [ServerStatus.STOPPING]: "text-orange-500 dark:text-orange-400",
};

export default function DashboardServerCard({
  server,
  status,
  selected,
  onSelect,
}: DashboardServerCardProps) {
  const { t } = useTranslation("modules.sidebar.serversList");
  const { t: tc } = useTranslation("modules.sidebar.serverControls");
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasServerAccess = useAuthStore((s) => s.hasServerAccess);

  const [iconError, setIconError] = useState(false);
  const [busy, setBusy] = useState(false);

  const serverStatus =
    ((status?.status ?? server.status) as ServerStatus) || ServerStatus.STOPPED;
  const isRunning = serverStatus === ServerStatus.RUNNING;
  const isStopped = serverStatus === ServerStatus.STOPPED;

  const playersOnline =
    status?.players?.online ?? status?.runtime?.playersOnline;
  const playersMax = status?.players?.max;

  const blueprint = useBlueprint(server.blueprintId);
  const gameVersion = server.variables?.GAME_VERSION;
  const versionLabel = gameVersion != null ? String(gameVersion) : null;

  const typeLabel = blueprint?.shortName ?? blueprint?.name ?? null;
  const coreSuffix = server.blueprintId.split(".").pop();

  const playersText =
    isRunning && typeof playersOnline === "number"
      ? typeof playersMax === "number" && playersMax > 0
        ? `${playersOnline} / ${playersMax}`
        : `${playersOnline}`
      : t("serverOffline");

  const canControl =
    hasPermission(UserPermissions.SERVERS_CONTROL) &&
    hasServerAccess(server.id);

  // Run a lifecycle action, guarding against concurrent acts
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      console.error("Server control action failed:", error);
    } finally {
      setBusy(false);
    }
  };

  const stopClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(server.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(server.id);
        }
      }}
      className={cn(
        "cursor-pointer gap-0 py-0 transition-all hover:border-border hover:shadow-md",
        selected
          ? "border-primary/60 from-primary/5 to-primary/10 ring-1 ring-primary/40"
          : "hover:bg-accent/30"
      )}
    >
      {/* Icon + controls => compact stacked column: name / status / badges */}
      <div className="flex items-center gap-2.5 px-3 py-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {!iconError ? (
            <BlobImage
              src={`servers/${server.id}/icon`}
              alt={server.name}
              className="h-full w-full object-cover"
              onError={() => setIconError(true)}
            />
          ) : (
            <ServerIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm leading-tight font-semibold">
            {server.name}
          </span>

          <div className="flex min-w-0 items-center gap-1.5">
            <ServerStatusIndicator
              status={serverStatus}
              variant="dot"
              size="sm"
              className="shrink-0"
            />
            <span
              className={cn(
                "truncate text-xs leading-tight font-medium",
                STATUS_TEXT_CLASS[serverStatus] || "text-muted-foreground"
              )}
            >
              {t(`status.${serverStatus}`, serverStatus)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {versionLabel && (
              <Badge
                variant="info"
                className="h-[18px] gap-0.5 px-1.5 text-[10px]"
              >
                <Tag />
                {versionLabel}
              </Badge>
            )}
            {typeLabel && (
              <Badge
                variant="secondary"
                className="hidden h-[18px] gap-0.5 px-1.5 text-[10px] sm:inline-flex"
              >
                <BlueprintIcon
                  icon={blueprint?.icon}
                  coreType={coreSuffix}
                  label={typeLabel}
                  className="size-3"
                />
                {typeLabel}
              </Badge>
            )}
            <Badge
              variant={isRunning ? "success" : "outline"}
              className="h-[18px] gap-0.5 px-1.5 text-[10px]"
            >
              <UsersRound />
              {playersText}
            </Badge>
          </div>
        </div>

        {canControl && (
          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={stopClick}
          >
            <TooltipButton
              size="icon-sm"
              variant="ghost"
              className="text-[oklch(0.55_0.17_140)] dark:text-[oklch(0.80_0.18_140)]"
              tooltipContent={tc("startServer")}
              onClick={() => run(() => api.servers.start(server.id))}
              disabled={
                busy || isRunning || serverStatus === ServerStatus.STARTING
              }
            >
              <Play className="h-5 w-5" />
            </TooltipButton>

            <TooltipButton
              size="icon-sm"
              variant="ghost"
              className="text-[oklch(0.55_0.13_70)] dark:text-[oklch(0.82_0.16_70)]"
              tooltipContent={tc("stopServer")}
              onClick={() => run(() => api.servers.stop(server.id))}
              disabled={
                busy || isStopped || serverStatus === ServerStatus.STOPPING
              }
            >
              <Square className="h-5 w-5" />
            </TooltipButton>

            <TooltipButton
              size="icon-sm"
              variant="ghost"
              className="text-[oklch(0.50_0.13_220)] dark:text-[oklch(0.80_0.15_220)]"
              tooltipContent={tc("restartServer")}
              onClick={() => run(() => api.servers.restart(server.id))}
              disabled={
                busy || isStopped || serverStatus === ServerStatus.STOPPING
              }
            >
              <RotateCw className="h-5 w-5" />
            </TooltipButton>

            <TooltipButton
              size="icon-sm"
              variant="ghost"
              className="text-destructive"
              tooltipContent={
                <div className="text-center">
                  <div className="font-medium">{tc("forceStop")}</div>
                  <div className="text-xs text-muted-foreground">
                    {tc("immediateShutdown")}
                  </div>
                </div>
              }
              onClick={() => run(() => api.servers.kill(server.id))}
              disabled={busy || isStopped}
            >
              <OctagonX className="h-5 w-5" />
            </TooltipButton>
          </div>
        )}
      </div>
    </Card>
  );
}
