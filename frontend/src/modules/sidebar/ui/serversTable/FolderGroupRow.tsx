"use client";
import { useDeleteFolderMutation } from "@/modules/server";
import {
  SERVER_DND_MIME,
  useMoveServerToFolder,
} from "@/modules/sidebar/hooks/useMoveServerToFolder";
import FolderColorDot from "@/modules/sidebar/ui/FolderColorDot";
import type { FolderSelectionState } from "@/modules/sidebar/ui/FolderSection";
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
import { TableCell, TableRow } from "@/shared/ui/table";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { Folder, Pencil, Trash2 } from "lucide-react";
import React, { useState } from "react";

interface Props {
  folder: IServerFolder | null;
  count: number;
  colSpan: number;
  selectionMode: boolean;
  selectionState: FolderSelectionState;
  onToggleSelectAll: () => void;
  onRenameFolder: (f: IServerFolder) => void;
}

const FolderGroupRow: React.FC<Props> = ({
  folder,
  count,
  colSpan,
  selectionMode,
  selectionState,
  onToggleSelectAll,
  onRenameFolder,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");
  const deleteMut = useDeleteFolderMutation();
  const moveToFolder = useMoveServerToFolder();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const targetFolderId = folder?.id ?? null;

  return (
    <TableRow
      className={cn(
        "bg-muted/30 hover:bg-muted/30",
        isDragOver && "ring-1 ring-primary/50 ring-inset"
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
      onDrop={(e) => {
        const serverId = e.dataTransfer.getData(SERVER_DND_MIME);
        setIsDragOver(false);
        if (serverId) {
          e.preventDefault();
          void moveToFolder(serverId, targetFolderId);
        }
      }}
    >
      <TableCell colSpan={colSpan} className="py-2">
        <div className="flex items-center gap-2">
          {selectionMode && count > 0 && (
            <Checkbox
              checked={selectionState === "all"}
              indeterminate={selectionState === "some"}
              onCheckedChange={() => onToggleSelectAll()}
              aria-label={t("bulk.selectAllInFolder")}
            />
          )}
          {folder ? (
            <FolderColorDot color={folder.color} />
          ) : (
            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">
            {folder ? folder.name : t("folders.noFolder")}
          </span>
          <span className="text-xs text-muted-foreground">({count})</span>
          {folder && (
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRenameFolder(folder)}
                aria-label={t("folders.rename")}
                title={t("folders.rename")}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setConfirmOpen(true)}
                aria-label={t("folders.delete")}
                title={t("folders.delete")}
              >
                <Trash2 />
              </Button>
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
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default FolderGroupRow;
