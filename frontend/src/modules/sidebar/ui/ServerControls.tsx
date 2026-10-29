"use client";

import { useServerStatus, useServerStore } from "@/modules/server";
import { useServerActions } from "@/modules/server/hooks/useServerActions";
import { useServerItemAccess } from "@/modules/sidebar/hooks/useServerItemAccess";
import { useServersModal } from "@/modules/sidebar/store/servers-modal.store";
import { useServersListActions } from "@/modules/sidebar/ui/serversList/useServersListActions";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { toneClass } from "@/shared/ui/tone";
import { isOffline } from "@/modules/server/hooks/useServerMeta";
import { ServerStatus } from "@shared/types/server/server.types";
import {
  Copy,
  Download,
  Ellipsis,
  OctagonX,
  Pencil,
  Play,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";

const actionButton =
  "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-tone/14 text-[13px] font-medium text-tone transition-[background-color,translate] duration-150 outline-none hover:bg-tone/22 focus-visible:outline-2 focus-visible:outline-primary/70 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5";

export default function ServerControls() {
  const { t } = useTranslation("modules.sidebar.serverControls");
  const { t: tActions } = useTranslation("modules.sidebar.serversList.actions");
  const { selectedServer } = useServerStore();
  const status =
    useServerStatus(selectedServer?.id, selectedServer?.status) ??
    ServerStatus.STOPPED;
  const { perform, pending } = useServerActions(selectedServer?.id);
  const setServersModalOpen = useServersModal((s) => s.setOpen);
  const listActions = useServersListActions(setServersModalOpen);
  const access = useServerItemAccess(selectedServer?.id);

  if (!selectedServer) return null;

  const stopping = status === ServerStatus.STOPPING;
  // A hung start has to stay stoppable
  const live = status === ServerStatus.RUNNING || status === ServerStatus.STARTING;
  const running = status === ServerStatus.RUNNING;
  const id = selectedServer.id;
  const hasMenu = access.duplicate || access.rename || access.exportServer || access.kill || access.remove;
  if (!access.power && !hasMenu) return null;

  return (
    <div className="flex items-center gap-1 border-t border-sidebar-border/60 p-1.5 sidebar-mini:border-0 sidebar-mini:px-0 sidebar-mini:pb-0">
      {!access.power ? null : stopping ? (
        <button type="button" disabled className={cn(actionButton, toneClass.amber, "min-w-0 flex-1 sidebar-mini:gap-0")}>
          <RotateCw className="animate-spin" />
          <span className="truncate sidebar-mini:hidden">{t("stopping")}</span>
        </button>
      ) : live ? (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => perform("stop")}
          title={t("stopServer")}
          className={cn(actionButton, toneClass.red, "min-w-0 flex-1")}
        >
          <Square />
          <span className="truncate sidebar-mini:hidden">{t("stop")}</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => perform("start")}
          title={t("startServer")}
          className={cn(actionButton, toneClass.green, "min-w-0 flex-1")}
        >
          <Play />
          <span className="truncate sidebar-mini:hidden">{t("start")}</span>
        </button>
      )}

      {access.power && (
        <button
          type="button"
          disabled={!running || pending !== null}
          onClick={() => perform("restart")}
          title={t("restartServer")}
          aria-label={t("restartServer")}
          className={cn(actionButton, toneClass.cyan, "w-8 shrink-0 sidebar-mini:hidden")}
        >
          <RotateCw />
        </button>
      )}

      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("moreActions")}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 data-popup-open:bg-hover sidebar-mini:hidden [&_svg]:size-3.5"
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {access.duplicate && (
              <DropdownMenuItem onClick={() => listActions.handleDuplicateServer(id)}>
                <Copy />
                {tActions("duplicate")}
              </DropdownMenuItem>
            )}
            {access.rename && (
              <DropdownMenuItem onClick={() => listActions.handleRenameServer(id)}>
                <Pencil />
                {tActions("rename")}
              </DropdownMenuItem>
            )}
            {access.exportServer && (
              <DropdownMenuItem onClick={() => listActions.handleExportServer(id)}>
                <Download />
                {tActions("export")}
              </DropdownMenuItem>
            )}
            {(access.duplicate || access.rename || access.exportServer) && (access.kill || access.remove) && <DropdownMenuSeparator />}
            {access.kill && (
              <DropdownMenuItem
                variant="destructive"
                disabled={isOffline(status) || pending !== null}
                onClick={() => perform("kill")}
              >
                <OctagonX />
                {t("forceStop")}
              </DropdownMenuItem>
            )}
            {access.remove && (
              <DropdownMenuItem variant="destructive" onClick={() => listActions.handleDeleteServer(id)}>
                <Trash2 />
                {tActions("delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
