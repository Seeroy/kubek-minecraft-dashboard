"use client";
import {
  useAllServerStatuses,
  useServerFoldersQuery,
  useServerStore,
  type Server,
  type ServerStatusData,
} from "@/modules/server";
import { useGroupedServers } from "@/modules/sidebar/hooks/useGroupedServers";
import { useServerSelectionStore } from "@/modules/sidebar/store/selection.store";
import { useServersModal } from "@/modules/sidebar/store/servers-modal.store";
import BulkActionBar from "@/modules/sidebar/ui/BulkActionBar";
import { ServersListContext, type ServersListActions } from "@/modules/sidebar/ui/serversList/context";
import { FolderGroup } from "@/modules/sidebar/ui/serversList/FolderGroup";
import ServersListToolbar from "@/modules/sidebar/ui/serversList/ServersListToolbar";
import { ServersTable } from "@/modules/sidebar/ui/serversList/ServersTable";
import { ServerTile } from "@/modules/sidebar/ui/serversList/ServerTile";
import { useCreatingServers } from "@/modules/sidebar/ui/serversList/useCreatingServers";
import { useServersListActions } from "@/modules/sidebar/ui/serversList/useServersListActions";
import { useServersView, type ServersView } from "@/modules/sidebar/ui/serversList/useServersView";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Plate } from "@/shared/ui/plate";
import { Blocks, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function ServersView({ view, servers, statuses }: { view: ServersView; servers: Server[]; statuses: Record<string, ServerStatusData> }) {
  if (view === "table") return <ServersTable servers={servers} statuses={statuses} />;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
      {servers.map((server) => (
        <ServerTile key={server.id} server={server} live={statuses[server.id]} />
      ))}
    </div>
  );
}

export default function ServersList() {
  const { t } = useTranslation("modules.sidebar.serversList");
  const open = useServersModal((s) => s.open);
  const setOpen = useServersModal((s) => s.setOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const { view, changeView } = useServersView();
  const query = useDebouncedValue(searchQuery.trim().toLowerCase(), 200);

  const { servers, selectedServer } = useServerStore();
  const statuses = useAllServerStatuses();
  const { data: folders } = useServerFoldersQuery();
  const creatingById = useCreatingServers();
  const listActions = useServersListActions(setOpen);

  const selectionMode = useServerSelectionStore((s) => s.mode);
  const selectedIds = useServerSelectionStore((s) => s.selectedIds);
  const enableSelection = useServerSelectionStore((s) => s.enable);
  const disableSelection = useServerSelectionStore((s) => s.disable);
  const toggleGroup = useServerSelectionStore((s) => s.toggleGroup);

  // Shift+S opens the dialog from anywhere outside text fields
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "");
      if (event.shiftKey && event.key === "S" && !event.metaKey && !event.ctrlKey && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const filtered = useMemo(
    () => (query ? servers.filter((s) => s.name.toLowerCase().includes(query)) : servers),
    [servers, query]
  );
  const groups = useGroupedServers(filtered, folders);

  const context = useMemo(() => {
    const actions: ServersListActions = {
      select: listActions.handleServerSelect,
      duplicate: listActions.handleDuplicateServer,
      rename: listActions.handleRenameServer,
      exportServer: listActions.handleExportServer,
      remove: (id) => void listActions.handleDeleteServer(id),
      renameFolder: listActions.handleRenameFolder,
    };
    return { actions, creatingById, selectedServerId: selectedServer?.id };
  }, [listActions, creatingById, selectedServer?.id]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) disableSelection();
      }}
    >
      <DialogContent className="h-dvh max-h-none max-w-none rounded-none sm:h-[min(720px,90vh)] sm:max-w-[min(1024px,calc(100%-2rem))] sm:rounded-xl">
        <DialogHeader className="min-h-16 flex-row items-center gap-3">
          <Plate size="lg">
            <Blocks />
          </Plate>
          <div className="min-w-0">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>

        <ServersListToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          view={view}
          onChangeView={changeView}
          selectionMode={selectionMode}
          onToggleSelection={selectionMode ? disableSelection : enableSelection}
          onCreateServer={listActions.handleOpenCreateServer}
          onCreateFolder={listActions.handleOpenCreateFolder}
          onImport={listActions.handleImportServer}
          onCreateNetwork={listActions.handleCreateNetwork}
        />

        {selectionMode && filtered.length > 0 && (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <Checkbox
              checked={filtered.every((server) => selectedIds.includes(server.id))}
              indeterminate={selectedIds.length > 0 && !filtered.every((server) => selectedIds.includes(server.id))}
              onCheckedChange={() => toggleGroup(filtered.map((server) => server.id))}
            />
            {t("bulk.selectAll")}
          </label>
        )}

        <DialogBody className="pt-1">
          <ServersListContext value={context}>
            {filtered.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchX />
                  </EmptyMedia>
                  <EmptyTitle>{t("notFound")}</EmptyTitle>
                  {query && <EmptyDescription>{`"${searchQuery.trim()}"`}</EmptyDescription>}
                </EmptyHeader>
              </Empty>
            ) : query ? (
              // A search shows one flat list, folders would only add noise
              <div className="pt-3">
                <ServersView view={view} servers={filtered} statuses={statuses} />
              </div>
            ) : (
              groups
                .filter((group) => group.folder !== null || group.servers.length > 0)
                .map((group) => (
                  <FolderGroup
                    key={group.folder?.id ?? "none"}
                    folder={group.folder}
                    serverIds={group.servers.map((server) => server.id)}
                  >
                    <ServersView view={view} servers={group.servers} statuses={statuses} />
                  </FolderGroup>
                ))
            )}
          </ServersListContext>
        </DialogBody>

        {selectionMode && selectedIds.length > 0 && (
          <BulkActionBar selectedIds={selectedIds} actions={listActions.bulkActions} onCancel={disableSelection} />
        )}
      </DialogContent>
    </Dialog>
  );
}
