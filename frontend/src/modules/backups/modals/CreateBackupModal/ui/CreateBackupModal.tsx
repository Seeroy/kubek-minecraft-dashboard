"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Separator } from "@/shared/ui/separator";
import { Archive } from "lucide-react";
import { useCreateBackupForm } from "../hooks/useCreateBackupForm";
import { useExclusions } from "../hooks/useExclusions";
import { CreateBackupModalProps } from "../types";
import { AdvancedSettingsSection } from "./sections/AdvancedSettingsSection";
import { BackupTypeSection } from "./sections/BackupTypeSection";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { ExclusionsSection } from "./sections/ExclusionsSection";
import { FileSelectionSection } from "./sections/FileSelectionSection";

export function CreateBackupModal({
  isOpen,
  onClose,
  serverId,
}: CreateBackupModalProps) {
  const { t } = useTranslation("modules.backups");

  const {
    form,
    backupType,
    selectionMode,
    currentServerId,
    onSubmit,
    handleOpenChange,
  } = useCreateBackupForm({ isOpen, onClose, serverId });
  const exclusions = useExclusions(form);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:grid-rows-[auto_1fr_auto] max-sm:gap-0 max-sm:rounded-none max-sm:border-0 max-sm:p-0 sm:max-h-[90vh] sm:max-w-2xl sm:overflow-y-auto">
        <DialogHeader className="max-sm:border-b max-sm:border-border/60 max-sm:p-4 max-sm:pr-14">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("modals.createBackup.title")}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 max-sm:flex max-sm:min-h-0 max-sm:flex-col max-sm:space-y-0 max-sm:overflow-hidden"
        >
          <div className="space-y-6 max-sm:flex-1 max-sm:space-y-6 max-sm:overflow-y-auto max-sm:p-4">
            <BasicInfoSection form={form} t={t} />

            <Separator />

            <BackupTypeSection form={form} t={t} />

            <Separator />

            <AdvancedSettingsSection form={form} t={t} />

            <ExclusionsSection
              form={form}
              t={t}
              currentExclusion={exclusions.currentExclusion}
              setCurrentExclusion={exclusions.setCurrentExclusion}
              addExclusion={exclusions.addExclusion}
              removeExclusion={exclusions.removeExclusion}
              handleExclusionKeyPress={exclusions.handleExclusionKeyPress}
            />

            {backupType === "partial" && (
              <FileSelectionSection
                form={form}
                t={t}
                isOpen={isOpen}
                currentServerId={currentServerId}
                selectionMode={selectionMode}
              />
            )}
          </div>

          <DialogFooter className="gap-2 max-sm:border-t max-sm:border-border/60 max-sm:p-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="max-sm:w-full"
            >
              {t("modals.createBackup.form.buttons.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
              className="max-sm:w-full"
            >
              {form.formState.isSubmitting
                ? t("modals.createBackup.form.buttons.creating")
                : t("modals.createBackup.form.buttons.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
