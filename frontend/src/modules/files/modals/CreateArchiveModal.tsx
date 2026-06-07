"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Archive } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CreateArchiveModalProps extends ModalProps {
  selectedPaths?: string[];
  defaultName?: string;
  onConfirm?: (archiveName: string) => void;
}

const PREVIEW_LIMIT = 5;
const INVALID_NAME_CHARS = /[\\/:*?"<>|]/;

function CreateArchiveModalComponent({
  isOpen,
  onClose,
  selectedPaths = [],
  defaultName = "archive",
  onConfirm,
}: CreateArchiveModalProps) {
  const { t } = useTranslation("modules.files");
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (isOpen) setName(defaultName);
  }, [isOpen, defaultName]);

  const previewPaths = useMemo(
    () => selectedPaths.slice(0, PREVIEW_LIMIT),
    [selectedPaths]
  );
  const restCount = Math.max(0, selectedPaths.length - PREVIEW_LIMIT);

  const trimmed = name.trim();
  const isValid =
    trimmed.length > 0 &&
    !INVALID_NAME_CHARS.test(trimmed) &&
    trimmed !== "." &&
    trimmed !== "..";

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm?.(trimmed);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("modals.createArchive.title")}</DialogTitle>
              <DialogDescription>
                {t("modals.createArchive.description", {
                  count: selectedPaths.length,
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="archive-name">
              {t("modals.createArchive.form.name.label")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="archive-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) handleSubmit();
                }}
                placeholder={t("modals.createArchive.form.name.placeholder")}
                autoFocus
              />
              <span className="text-sm text-muted-foreground">.zip</span>
            </div>
          </div>

          {previewPaths.length > 0 && (
            <div className="space-y-1">
              <Label>{t("modals.createArchive.preview.label")}</Label>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
                {previewPaths.map((p) => (
                  <li key={p} className="truncate">
                    {p}
                  </li>
                ))}
                {restCount > 0 && (
                  <li className="italic">
                    {t("modals.createArchive.preview.more", {
                      count: restCount,
                    })}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            {t("modals.createArchive.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {t("modals.createArchive.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const CREATE_ARCHIVE_MODAL_ID = "files/create-archive";

export function CreateArchiveModalRegistration() {
  useThisModal({
    id: CREATE_ARCHIVE_MODAL_ID,
    component: CreateArchiveModalComponent,
    module: "file-manager",
  });
  return null;
}
