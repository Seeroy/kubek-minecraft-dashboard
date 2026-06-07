"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { Archive, Loader2, Trash2, X } from "lucide-react";
import React from "react";

interface FilesSelectionToolbarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isBusy?: boolean;
  progress?: number | null;
  progressLabel?: string | null;
}

const FilesSelectionToolbar: React.FC<FilesSelectionToolbarProps> = ({
  count,
  onClear,
  onDelete,
  onArchive,
  isBusy = false,
  progress = null,
  progressLabel = null,
}) => {
  const { t } = useTranslation("modules.files");

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-card/40 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            disabled={isBusy}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium">
            {t("ui.files.selection.count", { count })}
          </span>
        </div>

        {!isBusy && (
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="xs" onClick={onArchive}>
              <Archive className="mr-1 h-3.5 w-3.5" />
              {t("ui.files.selection.actions.archive")}
            </Button>
            <Button variant="destructive" size="xs" onClick={onDelete}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t("ui.files.selection.actions.delete")}
            </Button>
          </div>
        )}

        {isBusy && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{progress != null ? `${progress}%` : "..."}</span>
          </div>
        )}
      </div>

      {isBusy && (
        <div className="space-y-0.5">
          <Progress value={progress ?? 0} className="h-1" />
          {progressLabel && (
            <p className="truncate text-[10px] text-muted-foreground">
              {progressLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FilesSelectionToolbar;
