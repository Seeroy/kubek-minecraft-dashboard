"use client";
import { useDeleteFolderMutation } from "@/modules/server";
import {
  SERVER_DND_MIME,
  useMoveServerToFolder,
} from "@/modules/sidebar/hooks/useMoveServerToFolder";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { Folder, FolderOpen, Pencil, Trash2 } from "lucide-react";
import React, { useState } from "react";

export type FolderSelectionState = "none" | "some" | "all";

interface Props {
  folder: IServerFolder | null; // null = "No folder"
  count: number;
  children: React.ReactNode;
  onRename?: (folder: IServerFolder) => void;
  selectionMode?: boolean;
  selectionState?: FolderSelectionState;
  onToggleSelectAll?: () => void;
}

const FolderSection: React.FC<Props> = ({
  folder,
  count,
  children,
  onRename,
  selectionMode,
  selectionState = "none",
  onToggleSelectAll,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");
  const deleteMut = useDeleteFolderMutation();
  const moveToFolder = useMoveServerToFolder();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const targetFolderId = folder?.id ?? null;

  const handleDrop = (e: React.DragEvent) => {
    const serverId = e.dataTransfer.getData(SERVER_DND_MIME);
    setIsDragOver(false);
    if (serverId) {
      e.preventDefault();
      void moveToFolder(serverId, targetFolderId);
    }
  };

  return (
    <section
      className={cn(
        "space-y-2 rounded-xl transition-colors",
        isDragOver && "bg-primary/5 ring-1 ring-primary/40"
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(SERVER_DND_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setIsDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <header className="flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {selectionMode && count > 0 && (
            <Checkbox
              checked={selectionState === "all"}
              indeterminate={selectionState === "some"}
              onCheckedChange={() => onToggleSelectAll?.()}
              onClick={(e) => e.stopPropagation()}
              aria-label={t("bulk.selectAllInFolder")}
            />
          )}
          {folder ? (
            <FolderOpen
              className="h-4 w-4 text-muted-foreground"
              style={folder.color ? { color: folder.color } : undefined}
            />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">
            {folder ? folder.name : t("folders.noFolder")}
          </span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        {folder && (
          <div className="flex items-center gap-1">
            {onRename && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRename(folder)}
                aria-label={t("folders.rename")}
                title={t("folders.rename")}
              >
                <Pencil />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirmOpen(true)}
              aria-label={t("folders.delete")}
              title={t("folders.delete")}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </header>

      {count === 0 ? (
        <div className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted-foreground italic">
          {t("folders.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      )}

      {folder && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("folders.deleteConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("folders.deleteConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("bulk.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleteMut.isPending}
                onClick={async () => {
                  await deleteMut.mutateAsync(folder.id);
                  setConfirmOpen(false);
                }}
              >
                {t("folders.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
};

export default FolderSection;
