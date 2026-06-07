"use client";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useRenameServerMutation } from "@/modules/server";
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
import { Pencil, TriangleAlert } from "lucide-react";
import React, { useEffect, useState } from "react";

export interface RenameServerProps {
  server: Server;
}

export const RENAME_SERVER_MODAL_ID = "sidebar/rename-server";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/rename-server": { props: RenameServerProps; result: boolean };
  }
}

const RenameServerDialog: React.FC<ModalProps<boolean> & RenameServerProps> = ({
  isOpen,
  onClose,
  server,
}) => {
  const { t: tRoot } = useTranslation("modules.sidebar.serversList");
  const t = (key: string, ...args: any[]) =>
    tRoot(`dialogs.rename.${key}`, ...args);
  const { notify } = useNotifications();
  const mutation = useRenameServerMutation();

  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen && server) setName(server.name);
  }, [isOpen, server]);

  const trimmed = name.trim();
  const isBusy = mutation.isPending;
  const unchanged = server ? trimmed === server.name : true;

  const handleSubmit = async () => {
    if (!server || !trimmed || unchanged) return;
    try {
      await mutation.mutateAsync({ id: server.id, name: trimmed });
      notify({
        type: "success",
        title: t("successTitle"),
        icon: Pencil,
        duration: 4000,
      });
      onClose(true);
    } catch (e: any) {
      notify({
        type: "error",
        title: t("errorTitle"),
        message: e?.message,
        icon: TriangleAlert,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("nameLabel")}
            </label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmed && !unchanged) handleSubmit();
              }}
            />
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
            onClick={handleSubmit}
            disabled={!trimmed || unchanged || isBusy}
          >
            {isBusy ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function RenameServerDialogRegistration() {
  useThisModal({
    id: RENAME_SERVER_MODAL_ID,
    component: RenameServerDialog,
    module: "sidebar",
  });
  return null;
}

export default RenameServerDialog;
