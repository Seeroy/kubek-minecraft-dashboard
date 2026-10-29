"use client";
import { api } from "@/api";
import { CREATE_BACKUP_MODAL_ID } from "@/modules/backups/modals/CreateBackupModal";
import { useServerStatus, useServerStore } from "@/modules/server";
import { CREATE_SERVER_MODAL_ID } from "@/modules/server/modals/CreateServerModal";
import { allNavigation, serverScopedRoutes } from "@/modules/sidebar/data/navigation";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { meetsAccess } from "@/shared/lib/access";
import { routeAllowedByBlueprint } from "@/shared/lib/serverRestrictions";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { isOffline } from "@/modules/server/hooks/useServerMeta";
import { AccessArea } from "@shared/access/areas";
import {
  Database,
  OctagonX,
  Play,
  Plus,
  RotateCw,
  Server as ServerIcon,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { CommandAction } from "../types/command.types";

export function useCommandActions(): CommandAction[] {
  const router = useRouter();
  const { servers, selectedServer, selectServer } = useServerStore();
  const selectedStatus = useServerStatus(selectedServer?.id, selectedServer?.status);
  const user = useAuthStore((s) => s.user);
  const selectedBlueprint = useBlueprint(selectedServer?.blueprintId);
  const { open: openModal } = useModal();
  const { t: tNav } = useTranslation("modules.sidebar");
  const { t: tCmd } = useTranslation("modules.commandPalette");

  return useMemo<CommandAction[]>(() => {
    if (!user) return [];
    const actions: CommandAction[] = [];

    // Navigation - respects permission and blueprint route restrictions, like the sidebar
    for (const item of allNavigation) {
      if (
        selectedBlueprint &&
        !routeAllowedByBlueprint(item.href, selectedBlueprint)
      )
        continue;
      if (!meetsAccess(user, item.access, serverScopedRoutes.has(item.href) ? selectedServer?.id : null)) continue;

      actions.push({
        id: `nav:${item.href}`,
        group: "navigation",
        label: tNav(item.nameKey),
        hint: item.href,
        icon: item.icon,
        perform: () => router.push(item.href),
      });
    }

    // Server switching - only servers the user may access
    for (const server of servers) {
      if (!meetsAccess(user, "serverView", server.id)) continue;
      actions.push({
        id: `server:${server.id}`,
        group: "servers",
        label: server.name,
        hint:
          server.id === selectedServer?.id ? tCmd("hints.current") : undefined,
        icon: ServerIcon,
        keywords: server.blueprintId.split(".").pop(),
        perform: () => selectServer(server.id),
      });
    }

    // Contextual actions for the selected server
    if (selectedServer && meetsAccess(user, "serverView", selectedServer.id)) {
      const id = selectedServer.id;
      const isStopped = isOffline(selectedStatus);

      if (meetsAccess(user, [AccessArea.POWER, "write"], id)) {
        if (isStopped) {
          actions.push({
            id: "action:start",
            group: "actions",
            label: tCmd("actions.start"),
            hint: selectedServer.name,
            icon: Play,
            perform: () => api.servers.start(id),
          });
        } else {
          actions.push(
            {
              id: "action:stop",
              group: "actions",
              label: tCmd("actions.stop"),
              hint: selectedServer.name,
              icon: Square,
              perform: () => api.servers.stop(id),
            },
            {
              id: "action:restart",
              group: "actions",
              label: tCmd("actions.restart"),
              hint: selectedServer.name,
              icon: RotateCw,
              perform: () => api.servers.restart(id),
            }
          );
          if (meetsAccess(user, [AccessArea.POWER, "manage"], id)) {
            actions.push({
              id: "action:kill",
              group: "actions",
              label: tCmd("actions.kill"),
              hint: selectedServer.name,
              icon: OctagonX,
              perform: () => api.servers.kill(id),
            });
          }
        }
      }

      if (meetsAccess(user, [AccessArea.BACKUPS, "write"], id)) {
        actions.push({
          id: "action:backup",
          group: "actions",
          label: tCmd("actions.createBackup"),
          hint: selectedServer.name,
          icon: Database,
          perform: () => openModal(CREATE_BACKUP_MODAL_ID, { serverId: id }),
        });
      }
    }

    if (meetsAccess(user, [AccessArea.SERVERS, "write"])) {
      actions.push({
        id: "action:create-server",
        group: "actions",
        label: tCmd("actions.createServer"),
        icon: Plus,
        perform: () => openModal(CREATE_SERVER_MODAL_ID, {}),
      });
    }

    return actions;
  }, [
    user,
    servers,
    selectedServer,
    selectedStatus,
    selectedBlueprint,
    selectServer,
    openModal,
    router,
    tNav,
    tCmd,
  ]);
}
