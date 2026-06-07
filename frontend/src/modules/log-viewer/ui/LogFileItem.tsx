"use client";
import type { ILogFile } from "@/modules/log-viewer/types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Archive, FileText } from "lucide-react";
import React from "react";

interface Props {
  file: ILogFile;
  selected: boolean;
  onSelect: (name: string) => void;
}

const LogFileItem: React.FC<Props> = ({ file, selected, onSelect }) => {
  const { t } = useTranslation("modules.logViewer");
  const Icon = file.gzipped ? Archive : FileText;

  return (
    <button
      type="button"
      onClick={() => onSelect(file.name)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "border border-primary/40 bg-primary/10"
          : "border border-transparent hover:bg-accent/30"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatBytes(file.size)} · {new Date(file.modify).toLocaleString()}
        </div>
      </div>
      {file.gzipped && <Badge variant="secondary">{t("list.gz")}</Badge>}
    </button>
  );
};

export default LogFileItem;
