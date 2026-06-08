"use client";
import type { Server, ServerStatusData } from "@/modules/server";
import type { ServerGroup } from "@/modules/sidebar/hooks/useGroupedServers";
import FolderSection, {
  type FolderSelectionState,
} from "@/modules/sidebar/ui/FolderSection";
import ServerCard from "@/modules/sidebar/ui/ServerCard";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { Server as ServerIcon } from "lucide-react";
import React, { useMemo } from "react";

interface Props {
  groups: ServerGroup[];
  selectedServerId?: string;
  serverStatuses: Record<string, ServerStatusData>;
  iconErrors: Set<string>;
  onIconError: (id: string) => void;
  onSelect: (id: string) => void;
  selectionMode: boolean;
  selectedIds: string[];
  onToggleCheck: (id: string) => void;
  onToggleGroup: (ids: string[]) => void;
  onRenameFolder: (f: IServerFolder) => void;
  isFiltered: boolean;
  onDuplicateServer: (id: string) => void;
  onRenameServer: (id: string) => void;
  onExportServer: (id: string) => void;
  onDeleteServer: (id: string) => void;
}

function computeSelectionState(
  serverIds: string[],
  selected: Set<string>
): FolderSelectionState {
  if (serverIds.length === 0) return "none";
  let hit = 0;
  for (const id of serverIds) if (selected.has(id)) hit++;
  if (hit === 0) return "none";
  if (hit === serverIds.length) return "all";
  return "some";
}

const ServersListBody: React.FC<Props> = ({
  groups,
  selectedServerId,
  serverStatuses,
  iconErrors,
  onIconError,
  onSelect,
  selectionMode,
  selectedIds,
  onToggleCheck,
  onToggleGroup,
  onRenameFolder,
  isFiltered,
  onDuplicateServer,
  onRenameServer,
  onExportServer,
  onDeleteServer,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const totalCount = groups.reduce((acc, g) => acc + g.servers.length, 0);

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ServerIcon className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">{t("notFound")}</p>
      </div>
    );
  }

  const renderCards = (servers: Server[]) =>
    servers.map((server) => (
      <ServerCard
        key={server.id}
        server={server}
        status={serverStatuses[server.id]}
        selected={selectedServerId === server.id}
        iconError={iconErrors.has(server.id)}
        onIconError={onIconError}
        onSelect={onSelect}
        selectionMode={selectionMode}
        checked={selectedSet.has(server.id)}
        onToggleCheck={onToggleCheck}
        onDuplicate={onDuplicateServer}
        onRename={onRenameServer}
        onExport={onExportServer}
        onDelete={onDeleteServer}
      />
    ));

  // When user is searching, flatten into a single list (no folder grouping noise)
  if (isFiltered) {
    const flat = groups.flatMap((g) => g.servers);
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {renderCards(flat)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups
        .filter((g) => g.folder !== null || g.servers.length > 0)
        .map((g) => {
          const ids = g.servers.map((s) => s.id);
          return (
            <FolderSection
              key={g.folder?.id ?? "__no_folder__"}
              folder={g.folder}
              count={g.servers.length}
              onRename={g.folder ? onRenameFolder : undefined}
              selectionMode={selectionMode}
              selectionState={computeSelectionState(ids, selectedSet)}
              onToggleSelectAll={() => onToggleGroup(ids)}
            >
              {renderCards(g.servers)}
            </FolderSection>
          );
        })}
    </div>
  );
};

export default ServersListBody;
