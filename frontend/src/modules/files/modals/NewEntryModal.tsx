"use client";
import { useCreateDirectoryMutation, useWriteFileMutation } from "@/modules/files/api/files.queries";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { FileText, Folder } from "lucide-react";
import { useState } from "react";

type EntryKind = "file" | "directory";

export interface NewEntryProps {
  currentPath?: string;
  onCreated?: (name: string) => void;
  initialName?: string;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "files/new-file": { props: NewEntryProps; result: void };
    "files/new-directory": { props: NewEntryProps; result: void };
  }
}

type NewEntryModalProps = ModalProps & NewEntryProps;

// Texts and icon per kind, same layout
const KINDS = {
  file: {
    icon: FileText,
    modal: "modals.newFile",
    field: "modals.newFile.form.fileName",
    inputId: "filename",
    created: "notifications.success.fileCreated",
    failed: "notifications.error.createFile",
  },
  directory: {
    icon: Folder,
    modal: "modals.newDirectory",
    field: "modals.newDirectory.form.directoryName",
    inputId: "directoryname",
    created: "notifications.success.directoryCreated",
    failed: "notifications.error.createDirectory",
  },
} as const;

function NewEntryModal({ kind, isOpen, onClose, currentPath = "/", onCreated, initialName = "" }: NewEntryModalProps & { kind: EntryKind }) {
  const { t } = useTranslation("modules.files");
  const [name, setName] = useState(initialName);
  const { selectedServer } = useServerStore();
  const { notify } = useNotifications();
  const writeFile = useWriteFileMutation(selectedServer?.id);
  const createDirectory = useCreateDirectoryMutation(selectedServer?.id);
  const isLoading = writeFile.isPending || createDirectory.isPending;
  const copy = KINDS[kind];
  const Icon = copy.icon;

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed || !selectedServer) return;

    try {
      if (kind === "file") {
        const path = currentPath === "/" || currentPath === "" ? trimmed : `${currentPath}/${trimmed}`;
        await writeFile.mutateAsync({ path, data: " " });
      } else {
        await createDirectory.mutateAsync({ path: currentPath || "/", name: trimmed });
      }
      notify({ title: t(copy.created), type: "success" });
      onCreated?.(trimmed);
      onClose();
    } catch (error: unknown) {
      notify({
        title: (error instanceof Error && error.message) || t(copy.failed),
        type: "error",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      create();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t(`${copy.modal}.title`)}</DialogTitle>
              <DialogDescription>
                {t(`${copy.modal}.description`)} {currentPath}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={copy.inputId}>{t(`${copy.field}.label`)}</Label>
            <Input
              id={copy.inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t(`${copy.field}.placeholder`)}
              autoFocus
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t(`${copy.modal}.cancel`)}
          </Button>
          <Button onClick={create} disabled={!name.trim() || isLoading}>
            {isLoading ? t(`${copy.modal}.form.submit.loading`) : t(`${copy.modal}.form.submit.default`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const NewFileModal = (props: NewEntryModalProps) => <NewEntryModal kind="file" {...props} />;

export const NewDirectoryModal = (props: NewEntryModalProps) => <NewEntryModal kind="directory" {...props} />;
