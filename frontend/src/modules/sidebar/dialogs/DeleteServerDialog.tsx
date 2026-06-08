"use client";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useDeleteServerMutation } from "@/modules/server";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
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
import { Trash2, TriangleAlert } from "lucide-react";
import React, { useEffect, useState } from "react";

export interface DeleteServerProps {
  server: Server;
}

export const DELETE_SERVER_MODAL_ID = "sidebar/delete-server";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/delete-server": { props: DeleteServerProps; result: boolean };
  }
}

const DeleteServerDialog: React.FC<ModalProps<boolean> & DeleteServerProps> = ({
  isOpen,
  onClose,
  server,
}) => {
  const { t: tRoot } = useTranslation("modules.sidebar.serversList");
  const t = (key: string, ...args: any[]) =>
    tRoot(`dialogs.delete.${key}`, ...args);
  const { notify } = useNotifications();
  const mutation = useDeleteServerMutation();

  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmName("");
      setPassword("");
      setPasswordError(null);
    }
  }, [isOpen]);

  const nameMatches = server ? confirmName.trim() === server.name : false;
  const isBusy = mutation.isPending;
  const canSubmit = nameMatches && password.length > 0 && !isBusy;

  const handleSubmit = async () => {
    if (!server || !canSubmit) return;
    setPasswordError(null);
    try {
      await mutation.mutateAsync({
        id: server.id,
        password,
        confirmName: confirmName.trim(),
      });
      notify({
        type: "success",
        title: t("successTitle"),
        icon: Trash2,
        duration: 4000,
      });
      onClose(true);
    } catch (e: any) {
      const isInvalidPassword =
        e instanceof ApiError && /INVALID_PASSWORD/.test(e.message);
      if (isInvalidPassword) {
        setPasswordError(t("invalidPassword"));
      } else {
        notify({
          type: "error",
          title: t("errorTitle"),
          message: e?.message,
          icon: TriangleAlert,
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t("description")}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("confirmNameLabel")}
            </label>
            <Input
              autoFocus
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={server?.name ?? ""}
            />
            {server && !nameMatches && confirmName.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("confirmNameHint", server.name)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("passwordLabel")}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              autoComplete="current-password"
            />
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onClose(false)}
            disabled={isBusy}
          >
            {tRoot("bulk.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isBusy ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function DeleteServerDialogRegistration() {
  useThisModal({
    id: DELETE_SERVER_MODAL_ID,
    component: DeleteServerDialog,
    module: "sidebar",
  });
  return null;
}

export default DeleteServerDialog;
