"use client";
import { useNotifications } from "@/modules/notifications";
import { CREATE_SERVER_MODAL_ID, useServerStore } from "@/modules/server";
import {
  BULK_DELETE_SERVERS_MODAL_ID,
  DELETE_SERVER_MODAL_ID,
  DUPLICATE_SERVER_MODAL_ID,
  FOLDER_FORM_MODAL_ID,
  IMPORT_SERVER_MODAL_ID,
  MOVE_TO_FOLDER_MODAL_ID,
  RENAME_SERVER_MODAL_ID,
} from "@/modules/sidebar/modals";
import { NETWORK_WIZARD_MODAL_ID } from "@/modules/networks/modal-ids";
import { triggerServerExport } from "@/modules/sidebar/lib/triggerServerExport";
import { useServerSelectionStore } from "@/modules/sidebar/store/selection.store";
import type { BulkAction } from "@/modules/sidebar/ui/BulkActionBar";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTaskWaiter } from "@/shared/hooks/useWatchedTask";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { AccessArea } from "@shared/access/areas";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { FolderInput, Trash2 } from "lucide-react";
import { useMemo } from "react";

/** All actions for the servers list */
export function useServersListActions(setOpen: (open: boolean) => void) {
  const { servers, selectedServer, selectServer } = useServerStore();
  const { close } = useSidebarStore();
  const notifier = useNotifications();
  const waitForTask = useTaskWaiter();
  const { open: openModal } = useModal();
  const { t } = useTranslation("modules.sidebar.serversList");
  const selection = useServerSelectionStore();
  const canMove = useAuthStore((s) => s.can(AccessArea.SERVERS, "manage"));
  const canDelete = useAuthStore((s) => s.can(AccessArea.SETTINGS, "manage"));

  const selectedServerEntities = useMemo(
    () => servers.filter((s) => selection.selectedIds.includes(s.id)),
    [servers, selection.selectedIds]
  );

  const handleServerSelect = (serverId: string) => {
    selectServer(serverId);
    setOpen(false);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      close();
    }
  };

  const handleOpenCreateServer = () => {
    setOpen(false);
    void openModal(CREATE_SERVER_MODAL_ID);
  };

  const handleOpenCreateFolder = () => {
    void openModal(FOLDER_FORM_MODAL_ID, { editTarget: null });
  };

  const handleRenameFolder = (f: IServerFolder) => {
    void openModal(FOLDER_FORM_MODAL_ID, { editTarget: f });
  };

  const handleDuplicateServer = (id: string) => {
    const target = servers.find((s) => s.id === id);
    if (target) void openModal(DUPLICATE_SERVER_MODAL_ID, { server: target });
  };

  const handleRenameServer = (id: string) => {
    const target = servers.find((s) => s.id === id);
    if (target) void openModal(RENAME_SERVER_MODAL_ID, { server: target });
  };

  const handleDeleteServer = async (id: string) => {
    const target = servers.find((s) => s.id === id);
    if (!target) return;
    const deleted = await openModal(DELETE_SERVER_MODAL_ID, { server: target });
    if (deleted && selectedServer?.id === id) selectServer("");
  };

  const handleBulkDelete = async () => {
    const result = await openModal(BULK_DELETE_SERVERS_MODAL_ID, {
      servers: selectedServerEntities,
    });
    if (!result) return;
    if (selectedServer && result.deleted.includes(selectedServer.id)) {
      selectServer("");
    }
    selection.disable();
  };

  const handleMoveToFolder = async () => {
    const moved = await openModal(MOVE_TO_FOLDER_MODAL_ID, {
      serverIds: selection.selectedIds,
    });
    if (moved) selection.disable();
  };

  const handleImportServer = () => {
    void openModal(IMPORT_SERVER_MODAL_ID, {});
  };

  const handleCreateNetwork = () => {
    setOpen(false);
    void openModal(NETWORK_WIZARD_MODAL_ID, {});
  };

  const handleExportServer = (id: string) => {
    const target = servers.find((s) => s.id === id);
    if (!target) return;
    void triggerServerExport(target.id, notifier, waitForTask, {
      triggerTitle: t("dialogs.export.triggerTitle", target.name),
      packingMessage: t("dialogs.export.packingMessage"),
      downloadingMessage: t("dialogs.export.downloadingMessage"),
      readyTitle: t("dialogs.export.readyTitle"),
      readyMessage: t("dialogs.export.readyMessage", target.name),
      errorTitle: t("dialogs.export.errorTitle"),
    });
  };

  const bulkActions = ([
    canMove && {
      id: "move",
      label: t("folders.moveToFolder"),
      icon: FolderInput,
      run: handleMoveToFolder,
    },
    canDelete && {
      id: "delete",
      label: t("bulk.delete"),
      icon: Trash2,
      variant: "destructive",
      run: handleBulkDelete,
    },
  ] satisfies (BulkAction | false)[]).filter((action) => action !== false);

  return {
    handleServerSelect,
    handleOpenCreateServer,
    handleOpenCreateFolder,
    handleRenameFolder,
    handleDuplicateServer,
    handleRenameServer,
    handleDeleteServer,
    handleImportServer,
    handleCreateNetwork,
    handleExportServer,
    bulkActions,
  };
}
