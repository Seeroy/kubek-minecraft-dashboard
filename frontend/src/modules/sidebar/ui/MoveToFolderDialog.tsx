"use client";
import { useNotifications } from "@/modules/notifications";
import {
  useMoveServersMutation,
  useServerFoldersQuery,
  useServerStore,
} from "@/modules/server";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Folder, FolderMinus } from "lucide-react";
import React, { useEffect, useState } from "react";

export interface MoveToFolderProps {
  serverIds: string[];
}

export const MOVE_TO_FOLDER_MODAL_ID = "sidebar/move-to-folder";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/move-to-folder": { props: MoveToFolderProps; result: boolean };
  }
}

const MoveToFolderDialog: React.FC<ModalProps<boolean> & MoveToFolderProps> = ({
  isOpen,
  onClose,
  serverIds,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");
  const { notify } = useNotifications();
  const { data: folders } = useServerFoldersQuery();
  const move = useMoveServersMutation();
  const { updateServer } = useServerStore();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setSelectedFolderId(null);
  }, [isOpen]);

  const handleConfirm = async () => {
    try {
      await move.mutateAsync({ serverIds, folderId: selectedFolderId });
      for (const id of serverIds)
        updateServer(id, { folderId: selectedFolderId });
      onClose(true);
    } catch (error) {
      notify({
        title: t("folders.actionFailed"),
        message: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("folders.moveTitle")}</DialogTitle>
        </DialogHeader>

        <div className="-mx-2 max-h-72 space-y-1.5 overflow-y-auto px-2">
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              selectedFolderId === null
                ? "border border-primary/40 bg-primary/10"
                : "border border-transparent hover:bg-accent/30"
            )}
          >
            <FolderMinus className="h-4 w-4 text-muted-foreground" />
            <span>{t("folders.noFolder")}</span>
          </button>
          {folders?.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolderId(f.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                selectedFolderId === f.id
                  ? "border border-primary/40 bg-primary/10"
                  : "border border-transparent hover:bg-accent/30"
              )}
            >
              <Folder
                className="h-4 w-4"
                style={f.color ? { color: f.color } : undefined}
              />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose(false)}>
            {t("bulk.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={move.isPending || serverIds.length === 0}
          >
            {t("folders.moveConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function MoveToFolderDialogRegistration() {
  useThisModal({
    id: MOVE_TO_FOLDER_MODAL_ID,
    component: MoveToFolderDialog,
    module: "sidebar",
  });
  return null;
}

export default MoveToFolderDialog;
