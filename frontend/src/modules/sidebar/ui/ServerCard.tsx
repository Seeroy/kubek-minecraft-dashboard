"use client";
import type { Server, ServerStatusData } from "@/modules/server";
import { ServerStatusIndicator } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import type { CreationStatusView } from "@/modules/server/modals/CreateServerModal/stages";
import { SERVER_DND_MIME } from "@/modules/sidebar/hooks/useMoveServerToFolder";
import ServerCardMenu from "@/modules/sidebar/ui/ServerCardMenu";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import BlobImage from "@/shared/ui/BlobImage";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { ServerStatus } from "@shared/types/server/server.types";
import { Server as ServerIcon, Tag, UsersRound } from "lucide-react";
import React from "react";

interface ServerCardProps {
  server: Server;
  status?: ServerStatusData;
  /** Live creation status (progress + step message) while this server is being created */
  creating?: CreationStatusView;
  selected?: boolean;
  iconError?: boolean;
  onIconError: (id: string) => void;
  onSelect: (id: string) => void;
  selectionMode?: boolean;
  checked?: boolean;
  onToggleCheck?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRename?: (id: string) => void;
  onExport?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_TEXT_CLASS: Record<string, string> = {
  [ServerStatus.RUNNING]: "text-emerald-500 dark:text-emerald-400",
  [ServerStatus.STOPPED]: "text-rose-500 dark:text-rose-400",
  [ServerStatus.STARTING]: "text-amber-500 dark:text-amber-400",
  [ServerStatus.STOPPING]: "text-orange-500 dark:text-orange-400",
  crashed: "text-red-500 dark:text-red-400",
};

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  status,
  creating,
  selected,
  iconError,
  onIconError,
  onSelect,
  selectionMode,
  checked,
  onToggleCheck,
  onDuplicate,
  onRename,
  onExport,
  onDelete,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");

  const isCreating = creating != null;

  const serverStatus =
    ((status?.status ?? server.status) as ServerStatus) || ServerStatus.STOPPED;
  const isRunning = serverStatus === ServerStatus.RUNNING;

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

  return (
    <Card
      size="sm"
      role={isCreating ? undefined : "button"}
      tabIndex={isCreating ? undefined : 0}
      aria-disabled={isCreating || undefined}
      draggable={!selectionMode && !isCreating}
      onDragStart={
        isCreating
          ? undefined
          : (e) => {
              e.dataTransfer.setData(SERVER_DND_MIME, server.id);
              e.dataTransfer.effectAllowed = "move";
            }
      }
      onClick={
        isCreating
          ? undefined
          : () => {
              if (selectionMode) onToggleCheck?.(server.id);
              else onSelect(server.id);
            }
      }
      onKeyDown={
        isCreating
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (selectionMode) onToggleCheck?.(server.id);
                else onSelect(server.id);
              }
            }
      }
      className={cn(
        "relative transition-all",
        isCreating
          ? "cursor-default border-primary/40"
          : "cursor-pointer hover:border-border hover:shadow-md",
        !isCreating &&
          (selected && !selectionMode
            ? "border-primary/60 from-primary/5 to-primary/10 ring-1 ring-primary/40"
            : "hover:bg-accent/30"),
        selectionMode &&
          checked &&
          "border-primary/60 bg-primary/5 ring-1 ring-primary/40"
      )}
    >
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {isCreating ? null : selectionMode ? (
          <Checkbox
            checked={!!checked}
            onCheckedChange={() => onToggleCheck?.(server.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : onDuplicate && onRename && onExport && onDelete ? (
          <ServerCardMenu
            serverId={server.id}
            currentFolderId={server.folderId}
            onDuplicate={onDuplicate}
            onRename={onRename}
            onExport={onExport}
            onDelete={onDelete}
          />
        ) : null}
        <ServerStatusIndicator
          status={serverStatus}
          variant="dot"
          size="sm"
          className="m-0"
        />
      </div>

      <CardHeader>
        <div className="flex min-w-0 items-center gap-3 pr-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted sm:h-11 sm:w-11">
            {!iconError ? (
              <BlobImage
                src={`servers/${server.id}/icon`}
                alt={server.name}
                className="h-full w-full object-cover"
                onError={() => onIconError(server.id)}
              />
            ) : (
              <ServerIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">
              {server.name}
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium",
                isCreating
                  ? "text-primary"
                  : STATUS_TEXT_CLASS[serverStatus] || "text-muted-foreground"
              )}
            >
              {isCreating
                ? creating.message
                : t(`status.${serverStatus}`, serverStatus)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-1.5">
        {isCreating ? (
          <div className="w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${creating.progress}%` }}
              />
            </div>
            <span className="mt-1 block text-right text-xs font-medium text-muted-foreground tabular-nums">
              {creating.progress}%
            </span>
          </div>
        ) : (
          <>
            {versionLabel && (
              <Badge variant="info" className="gap-1">
                <Tag />
                {versionLabel}
              </Badge>
            )}
            {typeLabel && (
              <Badge
                variant="secondary"
                className="hidden gap-1 sm:inline-flex"
              >
                <BlueprintIcon
                  icon={blueprint?.icon}
                  coreType={coreSuffix}
                  label={typeLabel}
                  className="size-3.5"
                />
                {typeLabel}
              </Badge>
            )}
            <Badge
              variant={isRunning ? "success" : "outline"}
              className="gap-1"
            >
              <UsersRound />
              {playersText}
            </Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ServerCard;
