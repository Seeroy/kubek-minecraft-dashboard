"use client";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useDuplicateServerMutation } from "@/modules/server";
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
import { Copy, TriangleAlert } from "lucide-react";
import React, { useEffect, useState } from "react";

export interface DuplicateServerProps {
  server: Server;
}

export const DUPLICATE_SERVER_MODAL_ID = "sidebar/duplicate-server";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/duplicate-server": {
      props: DuplicateServerProps;
      result: string | null;
    };
  }
}

const DuplicateServerDialog: React.FC<
  ModalProps<string | null> & DuplicateServerProps
> = ({ isOpen, onClose, server }) => {
  const { t: tRoot } = useTranslation("modules.sidebar.serversList");
  const t = (key: string, ...args: any[]) =>
    tRoot(`dialogs.duplicate.${key}`, ...args);
  const { notify } = useNotifications();
  const mutation = useDuplicateServerMutation();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && server) {
      setName(`${server.name} (copy)`);
      setError(null);
    }
  }, [isOpen, server]);

  const trimmed = name.trim();
  const isBusy = mutation.isPending;

  const handleSubmit = async () => {
    if (!server || !trimmed) return;
    setError(null);
    try {
      const { server: created } = await mutation.mutateAsync({
        id: server.id,
        name: trimmed,
      });
      notify({
        type: "success",
        title: t("successTitle"),
        message: t("successMessage", created.name),
        icon: Copy,
        duration: 5000,
      });
      onClose(created.id);
    } catch (e: any) {
      if (e instanceof ApiError && e.message?.includes("NAME_TAKEN")) {
        setError(t("nameTaken"));
      } else {
        setError(e?.message ?? null);
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
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
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
              placeholder={t("namePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmed) handleSubmit();
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onClose(null)}
            disabled={isBusy}
          >
            {tRoot("bulk.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!trimmed || isBusy}>
            {isBusy ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function DuplicateServerDialogRegistration() {
  useThisModal({
    id: DUPLICATE_SERVER_MODAL_ID,
    component: DuplicateServerDialog,
    module: "sidebar",
  });
  return null;
}

export default DuplicateServerDialog;
