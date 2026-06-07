"use client";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useBulkDeleteServersMutation } from "@/modules/server";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Trash2, TriangleAlert } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

export interface BulkDeleteServersProps {
  servers: Server[];
}

export interface BulkDeleteServersResult {
  deleted: string[];
}

export const BULK_DELETE_SERVERS_MODAL_ID = "sidebar/bulk-delete-servers";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/bulk-delete-servers": {
      props: BulkDeleteServersProps;
      result: BulkDeleteServersResult | null;
    };
  }
}

const BulkDeleteServersDialog: React.FC<
  ModalProps<BulkDeleteServersResult | null> & BulkDeleteServersProps
> = ({ isOpen, onClose, servers }) => {
  const { t: tRoot } = useTranslation("modules.sidebar.serversList");
  const t = (key: string, ...args: any[]) =>
    tRoot(`dialogs.bulkDelete.${key}`, ...args);
  const { notify } = useNotifications();
  const mutation = useBulkDeleteServersMutation();

  const [password, setPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setAcknowledged(false);
      setPasswordError(null);
    }
  }, [isOpen]);

  const ids = useMemo(() => servers.map((s) => s.id), [servers]);
  const isBusy = mutation.isPending;
  const canSubmit =
    !isBusy && acknowledged && password.length > 0 && ids.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setPasswordError(null);
    try {
      const result = await mutation.mutateAsync({ ids, password });
      const ok = result.deleted.length;
      const fail = result.failed.length;
      notify({
        type: fail > 0 ? "warning" : "success",
        title:
          fail > 0 ? t("summaryPartial", ok, fail) : t("summarySuccess", ok),
        icon: Trash2,
        duration: 5000,
      });
      onClose({ deleted: result.deleted });
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
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            {t("title", servers.length)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t("description")}
          </div>

          <ScrollArea className="max-h-40 rounded-md border border-border">
            <ul className="divide-y divide-border text-sm">
              {servers.map((s) => (
                <li key={s.id} className="truncate px-3 py-1.5">
                  {s.name}
                </li>
              ))}
            </ul>
          </ScrollArea>

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

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(!!v)}
            />
            <span>{t("acknowledge")}</span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onClose(null)}
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

export function BulkDeleteServersDialogRegistration() {
  useThisModal({
    id: BULK_DELETE_SERVERS_MODAL_ID,
    component: BulkDeleteServersDialog,
    module: "sidebar",
  });
  return null;
}

export default BulkDeleteServersDialog;
