import type { Translator } from "@/locales/types";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { FileText, Folder } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useBackupFileScan } from "../../hooks/useBackupFileScan";
import type { CreateBackupFormValues } from "../../validations/schema";

interface FileSelectionSectionProps {
  form: UseFormReturn<CreateBackupFormValues>;
  t: Translator;
  isOpen: boolean;
  currentServerId?: string;
  selectionMode: "all" | "custom";
}

/**
 * Selection-mode picker and custom file list for partial backups
 */
export function FileSelectionSection({
  form,
  t,
  isOpen,
  currentServerId,
  selectionMode,
}: FileSelectionSectionProps) {
  const { files, isLoadingFiles } = useBackupFileScan({
    isOpen,
    currentServerId,
    backupType: "partial",
    selectionMode,
  });

  const selectionModeItems = [
    {
      value: "all",
      label: t("modals.createBackup.form.selectionMode.options.all"),
    },
    {
      value: "custom",
      label: t("modals.createBackup.form.selectionMode.options.custom"),
    },
  ];

  const toggleFileSelection = (filePath: string) => {
    const currentSelected = form.watch("selectedFiles") || [];
    const newSelected = currentSelected.includes(filePath)
      ? currentSelected.filter((p) => p !== filePath)
      : [...currentSelected, filePath];
    form.setValue("selectedFiles", newSelected);
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("modals.createBackup.form.selectionMode.label")}</Label>
          <Select
            items={selectionModeItems}
            value={form.watch("selectionMode")}
            onValueChange={(value) =>
              value && form.setValue("selectionMode", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectionModeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.selectionMode && (
            <p className="text-sm text-destructive">
              {form.formState.errors.selectionMode.message}
            </p>
          )}
        </div>

        {selectionMode === "custom" && (
          <div className="space-y-2">
            <Label>{t("modals.createBackup.form.fileSelection.label")}</Label>
            {isLoadingFiles ? (
              <div className="text-sm text-muted-foreground">
                {t("modals.createBackup.form.fileSelection.loading")}
              </div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-4 max-sm:max-h-64">
                {files.map((file) => (
                  <div
                    key={file.path}
                    className="flex cursor-pointer items-center gap-3 rounded py-2 hover:bg-muted/50"
                    onClick={() => toggleFileSelection(file.path)}
                  >
                    {file.type === "directory" ? (
                      <Folder className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.path}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {file.size
                        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                        : ""}
                    </div>
                    {form.watch("selectedFiles")?.includes(file.path) && (
                      <Badge variant="secondary" className="text-xs">
                        {t("modals.createBackup.form.fileSelection.selected")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(form.watch("selectedFiles") || []).length > 0 && (
              <div className="text-sm text-muted-foreground">
                {t(
                  "modals.createBackup.form.fileSelection.count",
                  (form.watch("selectedFiles") || []).length
                )}
              </div>
            )}
            {form.formState.errors.selectedFiles && (
              <p className="text-sm text-destructive">
                {form.formState.errors.selectedFiles.message}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
