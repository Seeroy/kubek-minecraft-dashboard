"use client";
import { useNotifications } from "@/modules/notifications";
import {
  CREATE_SERVER_MODAL_ID,
  useAllServerStatuses,
  useServerFoldersQuery,
  useServerStore,
} from "@/modules/server";
import { BULK_DELETE_SERVERS_MODAL_ID } from "@/modules/sidebar/dialogs/BulkDeleteServersDialog";
import { DELETE_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/DeleteServerDialog";
import { DUPLICATE_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/DuplicateServerDialog";
import { IMPORT_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/ImportServerDialog";
import { RENAME_SERVER_MODAL_ID } from "@/modules/sidebar/dialogs/RenameServerDialog";
import { useGroupedServers } from "@/modules/sidebar/hooks/useGroupedServers";
import { triggerServerExport } from "@/modules/sidebar/lib/triggerServerExport";
import { useServerSelectionStore } from "@/modules/sidebar/store/selection.store";
import BulkActionBar, { BulkAction } from "@/modules/sidebar/ui/BulkActionBar";
import { FOLDER_FORM_MODAL_ID } from "@/modules/sidebar/ui/FolderFormDialog";
import { MOVE_TO_FOLDER_MODAL_ID } from "@/modules/sidebar/ui/MoveToFolderDialog";
import ServersListBody from "@/modules/sidebar/ui/ServersListBody";
import ServersListSearch from "@/modules/sidebar/ui/ServersListSearch";
import ServersListTrigger from "@/modules/sidebar/ui/ServersListTrigger";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { ScrollArea } from "@/shared/ui/scroll-area";
import type { IServerFolder } from "@shared/types/server/folder.types";
import {
  CheckSquare,
  FolderInput,
  FolderPlus,
  Layers,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

const ServersList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());

  const debouncedQuery = useDebouncedValue(
    searchQuery.trim().toLowerCase(),
    200
  );
  const { servers, selectedServer, selectServer } = useServerStore();
  const serverStatuses = useAllServerStatuses();
  const { data: folders } = useServerFoldersQuery();
  const { t } = useTranslation("modules.sidebar.serversList");
  const { close } = useSidebarStore();
  const notifier = useNotifications();
  const { open: openModal } = useModal();

  const selection = useServerSelectionStore();

  const filteredServers = useMemo(() => {
    if (!debouncedQuery) return servers;
    return servers.filter((s) => s.name.toLowerCase().includes(debouncedQuery));
  }, [servers, debouncedQuery]);

  const groups = useGroupedServers(filteredServers, folders);

  const allVisibleIds = useMemo(
    () => filteredServers.map((s) => s.id),
    [filteredServers]
  );
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selection.selectedIds.includes(id));
  const someSelected = !allSelected && selection.selectedIds.length > 0;

  const handleServerSelect = (serverId: string) => {
    selectServer(serverId);
    setOpen(false);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      close();
    }
  };

  const handleIconError = (serverId: string) => {
    setIconErrors((prev) => new Set(prev).add(serverId));
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

  const selectedServerEntities = useMemo(
    () => servers.filter((s) => selection.selectedIds.includes(s.id)),
    [servers, selection.selectedIds]
  );

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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) selection.disable();
      }}
    >
      <ServersListTrigger
        selectedServer={selectedServer}
        iconErrors={iconErrors}
        onIconError={handleIconError}
      />

      <DialogContent className="inset-0 top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <div className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-5 sm:pt-5 sm:pr-16 sm:pb-4">
          <BlockHeader
            kicker={t("kicker")}
            title={t("title")}
            description={t("description")}
            icon={Layers}
            color="primary"
            className="mb-0 [&_p]:hidden sm:[&_p]:block"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-border p-3 sm:p-4">
          <div className="min-w-0 flex-1">
            <ServersListSearch value={searchQuery} onChange={setSearchQuery} />
          </div>
          <Button
            size="sm"
            onClick={handleOpenCreateServer}
            className="px-2 sm:px-3"
            aria-label={t("newServer")}
          >
            <Plus />
            <span className="hidden sm:inline">{t("newServer")}</span>
          </Button>
          <Button
            size="sm"
            variant={selection.mode ? "default" : "outline"}
            onClick={() =>
              selection.mode ? selection.disable() : selection.enable()
            }
            className="px-2 sm:px-3"
            aria-label={
              selection.mode
                ? t("bulk.exitSelection")
                : t("bulk.enterSelection")
            }
          >
            <CheckSquare />
            <span className="hidden sm:inline">
              {selection.mode
                ? t("bulk.exitSelection")
                : t("bulk.enterSelection")}
            </span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenCreateFolder}
            className="px-2 sm:px-3"
            aria-label={t("folders.create")}
          >
            <FolderPlus />
            <span className="hidden sm:inline">{t("folders.create")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleImportServer}
            className="px-2 sm:px-3"
            aria-label={t("actions.import")}
          >
            <Upload />
            <span className="hidden sm:inline">{t("actions.import")}</span>
          </Button>
        </div>

        {selection.mode && allVisibleIds.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card/40 px-3 py-2 sm:px-4">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={() => selection.toggleGroup(allVisibleIds)}
              aria-label={t("bulk.selectAll")}
            />
            <span className="text-xs text-muted-foreground">
              {t("bulk.selectAll")}
            </span>
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4">
            <ServersListBody
              groups={groups}
              selectedServerId={selectedServer?.id}
              serverStatuses={serverStatuses}
              iconErrors={iconErrors}
              onIconError={handleIconError}
              onSelect={handleServerSelect}
              selectionMode={selection.mode}
              selectedIds={selection.selectedIds}
              onToggleCheck={selection.toggle}
              onToggleGroup={selection.toggleGroup}
              onRenameFolder={handleRenameFolder}
              isFiltered={!!debouncedQuery}
              onDuplicateServer={handleDuplicateServer}
              onRenameServer={handleRenameServer}
              onExportServer={handleExportServer}
              onDeleteServer={handleDeleteServer}
            />
          </div>
        </ScrollArea>

        {selection.mode && selection.selectedIds.length > 0 && (
          <BulkActionBar
            selectedIds={selection.selectedIds}
            actions={bulkActions}
            onCancel={() => selection.disable()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServersList;
