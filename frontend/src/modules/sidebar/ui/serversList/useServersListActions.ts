"use client";
import { useNotifications } from "@/modules/notifications";
import { CREATE_SERVER_MODAL_ID, useServerStore } from "@/modules/server";
import { BULK_DELETE_SERVERS_MODAL_ID } from "@/modules/sidebar/dialogs/BulkDeleteServersDialog";
import { DELETE_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/DeleteServerDialog";
import { DUPLICATE_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/DuplicateServerDialog";
import { IMPORT_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/ImportServerDialog";
import { RENAME_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/RenameServerDialog";
import { triggerServerExport } from "@/modules/sidebar/lib/triggerServerExport";
import { useServerSelectionStore } from "@/modules/sidebar/store/selection.store";
import type { BulkAction } from "@/modules/sidebar/ui/BulkActionBar";
import { FOLDER_FORM_MODAL_ID } from "@/modules/sidebar/ui/FolderFormDialog";
import { MOVE_TO_FOLDER_MODAL_ID } from "@/modules/sidebar/ui/MoveToFolderDialog";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { FolderInput, Trash2 } from "lucide-react";
import { useMemo } from "react";

/** All actions for the servers list */
export function useServersListActions(setOpen: (open: boolean) => void) {
  const { servers, selectedServer, selectServer } = useServerStore();
  const { close } = useSidebarStore();
  const notifier = useNotifications();
  const { open: openModal } = useModal();
  const { t } = useTranslation("modules.sidebar.serversList");
  const selection = useServerSelectionStore();

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

  const handleExportServer = (id: string) => {
    const target = servers.find((s) => s.id === id);
    if (!target) return;
    void triggerServerExport(target.id, target.name, notifier, {
      triggerTitle: t("dialogs.export.triggerTitle"),
      triggerMessage: t("dialogs.export.triggerMessage", target.name),
      readyTitle: t("dialogs.export.readyTitle"),
      readyMessage: t("dialogs.export.readyMessage", target.name),
      errorTitle: t("dialogs.export.errorTitle"),
    });
  };

  const bulkActions: BulkAction[] = [
    {
      id: "move",
      label: t("folders.moveToFolder"),
      icon: FolderInput,
      run: handleMoveToFolder,
    },
    {
      id: "delete",
      label: t("bulk.delete"),
      icon: Trash2,
      variant: "destructive",
      run: handleBulkDelete,
    },
  ];

  return {
    handleServerSelect,
    handleOpenCreateServer,
    handleOpenCreateFolder,
    handleRenameFolder,
    handleDuplicateServer,
    handleRenameServer,
    handleDeleteServer,
    handleImportServer,
    handleExportServer,
    bulkActions,
  };
}
