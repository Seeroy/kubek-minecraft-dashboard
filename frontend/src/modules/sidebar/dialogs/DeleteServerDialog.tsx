"use client";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useDeleteServerMutation } from "@/modules/server";
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
import React, { useState } from "react";

export interface DeleteServerProps {
  server: Server;
}

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
  const t = (key: string, ...args: unknown[]) =>
    tRoot(`dialogs.delete.${key}`, ...args);
  const { notify } = useNotifications();
  const mutation = useDeleteServerMutation();

  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    } catch (e) {
      const isInvalidPassword =
        e instanceof ApiError && e.code === "INVALID_PASSWORD";
      if (isInvalidPassword) {
        setPasswordError(t("invalidPassword"));
      } else {
        notify({
          type: "error",
          title: t("errorTitle"),
          message: e instanceof Error ? e.message : undefined,
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

export default DeleteServerDialog;
