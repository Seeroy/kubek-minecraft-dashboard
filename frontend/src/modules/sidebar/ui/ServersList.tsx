"use client";
import {
  useAllServerStatuses,
  useServerFoldersQuery,
  useServerStore,
} from "@/modules/server";
import { useGroupedServers } from "@/modules/sidebar/hooks/useGroupedServers";
import { useServerSelectionStore } from "@/modules/sidebar/store/selection.store";
import BulkActionBar from "@/modules/sidebar/ui/BulkActionBar";
import ServersListBody from "@/modules/sidebar/ui/ServersListBody";
import ServersListTable from "@/modules/sidebar/ui/ServersListTable";
import ServersListTrigger from "@/modules/sidebar/ui/ServersListTrigger";
import ServersListToolbar from "@/modules/sidebar/ui/serversList/ServersListToolbar";
import { useCreatingServers } from "@/modules/sidebar/ui/serversList/useCreatingServers";
import { useServersListActions } from "@/modules/sidebar/ui/serversList/useServersListActions";
import { useServersView } from "@/modules/sidebar/ui/serversList/useServersView";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Layers } from "lucide-react";
import { useMemo, useState } from "react";

const ServersList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());
  const { view, changeView } = useServersView();

  const debouncedQuery = useDebouncedValue(
    searchQuery.trim().toLowerCase(),
    200
  );
  const { servers, selectedServer } = useServerStore();
  const serverStatuses = useAllServerStatuses();
  const { data: folders } = useServerFoldersQuery();
  const { t } = useTranslation("modules.sidebar.serversList");

  const selection = useServerSelectionStore();
  const creatingById = useCreatingServers();
  const actions = useServersListActions(setOpen);

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

  const handleIconError = (serverId: string) => {
    setIconErrors((prev) => new Set(prev).add(serverId));
  };

  // Props shared by the cards and table views
  const sharedViewProps = {
    creatingById,
    selectedServerId: selectedServer?.id,
    serverStatuses,
    iconErrors,
    onIconError: handleIconError,
    onSelect: actions.handleServerSelect,
    selectionMode: selection.mode,
    selectedIds: selection.selectedIds,
    onToggleCheck: selection.toggle,
    onToggleGroup: selection.toggleGroup,
    onRenameFolder: actions.handleRenameFolder,
    onDuplicateServer: actions.handleDuplicateServer,
    onRenameServer: actions.handleRenameServer,
    onExportServer: actions.handleExportServer,
    onDeleteServer: actions.handleDeleteServer,
  };

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

      <DialogContent className="inset-0 top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <div className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-5 sm:pt-5 sm:pr-16 sm:pb-4">
          <BlockHeader
            kicker={t("kicker")}
            title={t("title")}
            description={t("description")}
            icon={Layers}
            color="primary"
            className="mb-0! [&_p]:hidden sm:[&_p]:block"
          />
        </div>

        <ServersListToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          view={view}
          onChangeView={changeView}
          selectionMode={selection.mode}
          onToggleSelection={() =>
            selection.mode ? selection.disable() : selection.enable()
          }
          onCreateServer={actions.handleOpenCreateServer}
          onCreateFolder={actions.handleOpenCreateFolder}
          onImport={actions.handleImportServer}
        />

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
            {view === "table" ? (
              <ServersListTable
                servers={filteredServers}
                folders={folders}
                isFiltered={!!debouncedQuery}
                {...sharedViewProps}
              />
            ) : (
              <ServersListBody
                groups={groups}
                isFiltered={!!debouncedQuery}
                {...sharedViewProps}
              />
            )}
          </div>
        </ScrollArea>

        {selection.mode && selection.selectedIds.length > 0 && (
          <BulkActionBar
            selectedIds={selection.selectedIds}
            actions={actions.bulkActions}
            onCancel={() => selection.disable()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServersList;
