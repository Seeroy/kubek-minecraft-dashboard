"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { Checkbox } from "@/shared/ui/checkbox";
import { DataReveal } from "@/shared/ui/data-reveal";
import { FileType } from "@shared/types/file.types";
import { FileText, Folder } from "lucide-react";
import { useBackupFileScan } from "../../api/backups.queries";
import { SAMPLE_SCAN_FILES } from "../../data/samples";

interface FilePickerProps {
  serverId: string;
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Top level files and folders of the server, picked with checkboxes */
export function FilePicker({ serverId, selected, onChange }: FilePickerProps) {
  const { t } = useTranslation("modules.backups.createModal");
  const { data: files, isLoading } = useBackupFileScan(serverId, true);

  const toggle = (path: string, checked: boolean) =>
    onChange(checked ? [...selected, path] : selected.filter((item) => item !== path));

  return (
    <DataReveal id="backups-create-files" data={files ?? []} loading={isLoading} sample={SAMPLE_SCAN_FILES} label={t("loadingFiles")}>
      {(list) => (
        <div className="max-h-56 scrollbar-thin overflow-y-auto rounded-md border border-border">
          {list.map((file) => {
            const directory = file.type === FileType.DIRECTORY;
            return (
              <label
                key={file.path}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-[7px] not-first:border-t not-first:border-border hover:bg-hover"
              >
                <Checkbox checked={selected.includes(file.path)} onCheckedChange={(checked) => toggle(file.path, checked)} />
                {directory ? <Folder className="size-4 text-c-amber" /> : <FileText className="size-4 text-muted-foreground" />}
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                {!directory && file.size > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(file.size)}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </DataReveal>
  );
}
