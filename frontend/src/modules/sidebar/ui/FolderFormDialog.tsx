"use client";
import { useNotifications } from "@/modules/notifications";
import {
  useCreateFolderMutation,
  useUpdateFolderMutation,
} from "@/modules/server";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import type { IServerFolder } from "@shared/types/server/folder.types";
import { Folder } from "lucide-react";
import React, { useEffect, useState } from "react";

export interface FolderFormProps {
  // If provided - modal works in "rename" mode for this folder
  editTarget?: IServerFolder | null;
}

export const FOLDER_FORM_MODAL_ID = "sidebar/folder-form";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/folder-form": { props: FolderFormProps; result: boolean };
  }
}

const PRESET_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
];

const FolderFormDialog: React.FC<ModalProps<boolean> & FolderFormProps> = ({
  isOpen,
  onClose,
  editTarget,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");
  const { notify } = useNotifications();
  const createMut = useCreateFolderMutation();
  const updateMut = useUpdateFolderMutation();

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    if (editTarget) {
      setName(editTarget.name);
      setColor(editTarget.color ?? "");
    } else {
      setName("");
      setColor("");
    }
  }, [isOpen, editTarget]);

  const isEdit = !!editTarget;
  const isBusy = createMut.isPending || updateMut.isPending;
  const trimmed = name.trim();

  const handleSubmit = async () => {
    if (!trimmed) return;
    try {
      if (isEdit) {
        await updateMut.mutateAsync({
          id: editTarget!.id,
          data: { name: trimmed, color: color || null },
        });
      } else {
        await createMut.mutateAsync({ name: trimmed, color: color || null });
      }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-4 w-4" style={color ? { color } : undefined} />
            {isEdit ? t("folders.renameTitle") : t("folders.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("folders.namePlaceholder")}
            </label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("folders.namePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmed) handleSubmit();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("folders.color")}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    color === c
                      ? "scale-110 border-foreground/60"
                      : "border-transparent hover:border-foreground/30"
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
              <button
                type="button"
                onClick={() => setColor("")}
                className={`grid h-7 w-7 place-items-center rounded-full border-2 text-xs transition ${
                  color === ""
                    ? "border-foreground/60"
                    : "border-border hover:border-foreground/30"
                }`}
                title={t("folders.colorNone")}
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose(false)}>
            {t("bulk.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!trimmed || isBusy}>
            {isEdit ? t("folders.save") : t("folders.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function FolderFormDialogRegistration() {
  useThisModal({
    id: FOLDER_FORM_MODAL_ID,
    component: FolderFormDialog,
    module: "sidebar",
  });
  return null;
}

export default FolderFormDialog;
