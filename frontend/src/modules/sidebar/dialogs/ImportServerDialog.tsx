"use client";
import { useNotifications } from "@/modules/notifications";
import { useImportServerMutation } from "@/modules/server";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
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
import { FileArchive, TriangleAlert, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface ImportServerProps {}

export const IMPORT_SERVER_MODAL_ID = "sidebar/import-server";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/import-server": {
      props: ImportServerProps;
      result: string | null;
    };
  }
}

const ImportServerDialog: React.FC<
  ModalProps<string | null> & ImportServerProps
> = ({ isOpen, onClose }) => {
  const { t: tRoot } = useTranslation("modules.sidebar.serversList");
  const t = (key: string, ...args: any[]) =>
    tRoot(`dialogs.import.${key}`, ...args);
  const { notify } = useNotifications();
  const mutation = useImportServerMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setName("");
      setError(null);
      setDragOver(false);
    }
  }, [isOpen]);

  const isBusy = mutation.isPending;
  const canSubmit = !!file && !isBusy;

  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) {
      setError(t("invalidArchive"));
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setError(null);
    try {
      const { server } = await mutation.mutateAsync({
        archive: file,
        name: name.trim() || undefined,
      });
      notify({
        type: "success",
        title: t("successTitle"),
        message: t("successMessage", server.name),
        icon: FileArchive,
        duration: 5000,
      });
      onClose(server.id);
    } catch (e: any) {
      const msg = e?.message || "";
      if (e instanceof ApiError && /NAME_TAKEN/.test(msg)) {
        setError(t("nameTaken"));
      } else if (/manifest|archive|unpack/i.test(msg)) {
        setError(t("invalidArchive"));
      } else {
        notify({
          type: "error",
          title: t("errorTitle"),
          message: msg,
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
            <Upload className="h-4 w-4" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("description")}</p>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground/40"
            )}
          >
            <FileArchive className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            {file ? t("selected", file.name) : t("dropzone")}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("optionalNameLabel")}
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {t("optionalNameHelp")}
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onClose(null)}
            disabled={isBusy}
          >
            {tRoot("bulk.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isBusy ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function ImportServerDialogRegistration() {
  useThisModal({
    id: IMPORT_SERVER_MODAL_ID,
    component: ImportServerDialog,
    module: "sidebar",
  });
  return null;
}

export default ImportServerDialog;
