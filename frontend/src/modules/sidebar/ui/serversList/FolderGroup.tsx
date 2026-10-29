"use client";

import { useDeleteFolderMutation } from "@/modules/server";
import { SERVER_DND_MIME, useMoveServerToFolder } from "@/modules/sidebar/hooks/useMoveServerToFolder";
import { useServerSelectionStore } from "@/modules/sidebar/store/selection.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { AccessArea } from "@shared/access/areas";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { Folder, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { useServersList } from "./context";

interface FolderGroupProps {
  folder: IServerFolder | null;
  serverIds: string[];
  children: ReactNode;
}

export function FolderGroup({ folder, serverIds, children }: FolderGroupProps) {
  const { t } = useTranslation("modules.sidebar.serversList");
  const { actions } = useServersList();
  const deleteFolder = useDeleteFolderMutation();
  const moveToFolder = useMoveServerToFolder();
  const selectionMode = useServerSelectionStore((s) => s.mode);
  const toggleGroup = useServerSelectionStore((s) => s.toggleGroup);
  const selectedCount = useServerSelectionStore(
    (s) => serverIds.filter((id) => s.selectedIds.includes(id)).length
  );
  const [dragOver, setDragOver] = useState(false);
  const canManageFolders = useAuthStore((s) => s.can(AccessArea.SERVERS, "manage"));

  const onDragOver = (event: DragEvent) => {
    if (!canManageFolders || !event.dataTransfer.types.includes(SERVER_DND_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const onDrop = (event: DragEvent) => {
    setDragOver(false);
    const serverId = event.dataTransfer.getData(SERVER_DND_MIME);
    if (!serverId) return;
    event.preventDefault();
    void moveToFolder(serverId, folder?.id ?? null);
  };

  const removeFolder = async () => {
    if (!folder) return;
    const confirmed = await confirmDialog({
      title: t("folders.deleteConfirmTitle"),
      description: t("folders.deleteConfirmDescription"),
      confirmText: t("folders.delete"),
      variant: "destructive",
      icon: Trash2,
    });
    if (confirmed) deleteFolder.mutate(folder.id);
  };

  const Icon = folder ? FolderOpen : Folder;

  return (
    <section
      data-drag-over={dragOver || undefined}
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={onDrop}
      className="-mx-2 rounded-lg px-2 pb-2 transition-colors data-drag-over:bg-primary/6 data-drag-over:ring-1 data-drag-over:ring-primary/40"
    >
      <header className="flex items-center gap-2 px-1 pt-3 pb-2 text-[12.5px] font-semibold text-muted-foreground">
        {selectionMode && serverIds.length > 0 && (
          <Checkbox
            checked={selectedCount === serverIds.length}
            indeterminate={selectedCount > 0 && selectedCount < serverIds.length}
            onCheckedChange={() => toggleGroup(serverIds)}
            aria-label={t("bulk.selectAllInFolder")}
          />
        )}
        <Icon
          style={folder?.color ? ({ "--c": folder.color } as CSSProperties) : undefined}
          className="size-3.5 data-[colored]:text-tone"
          data-colored={folder?.color ? "" : undefined}
        />
        <span className="truncate">{folder ? folder.name : t("folders.noFolder")}</span>
        <span className="font-normal tabular-nums">{serverIds.length}</span>
        {folder && canManageFolders && (
          <span className="ml-auto flex items-center gap-0.5">
            <Button variant="ghost" size="icon-xs" onClick={() => actions.renameFolder(folder)} aria-label={t("folders.rename")} title={t("folders.rename")}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={removeFolder} aria-label={t("folders.delete")} title={t("folders.delete")}>
              <Trash2 />
            </Button>
          </span>
        )}
      </header>
      {serverIds.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">{t("folders.empty")}</p>
      ) : (
        children
      )}
    </section>
  );
}
