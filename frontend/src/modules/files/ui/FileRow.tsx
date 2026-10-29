"use client";
import { isLogViewerFile } from "@/modules/files/lib/logFiles";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import { canEditFile, getFileTypeCategory, type FileTypeCategory } from "@/shared/lib/fileTypes";
import { buttonVariants } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Plate } from "@/shared/ui/plate";
import { TableCell, TableRow } from "@/shared/ui/table";
import type { Tone } from "@/shared/ui/tone";
import { FileType, type IFile } from "@shared/types/file.types";
import {
  Archive,
  Copy,
  Download,
  Ellipsis,
  FileArchive,
  FileCode,
  FileText,
  Folder,
  Image,
  Pencil,
  ScrollText,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { memo, type MouseEvent } from "react";
import type { FileActions, SelectModifiers } from "../lib/actions";

const look: Record<FileTypeCategory | "directory", { icon: LucideIcon; tone: Tone }> = {
  directory: { icon: Folder, tone: "amber" },
  image: { icon: Image, tone: "purple" },
  archive: { icon: Archive, tone: "orange" },
  script: { icon: FileCode, tone: "green" },
  text: { icon: FileText, tone: "blue" },
  other: { icon: FileText, tone: "gray" },
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" });

interface FileRowProps {
  file: IFile;
  index: number;
  actions: FileActions;
  selected: boolean;
  selectionMode: boolean;
  onSelect: (index: number, file: IFile, mods: SelectModifiers) => void;
  // Containing folder, shown in search results across the server
  pathHint?: string;
}

export const FileRow = memo(function FileRow({ file, index, actions, selected, selectionMode, onSelect, pathHint }: FileRowProps) {
  const { t } = useTranslation("modules.files.ui.fileItem.actions");
  const { notify } = useNotifications();
  const { t: tNotify } = useTranslation("modules.files.notifications.success");
  const isDir = file.type === FileType.DIRECTORY;
  const { icon: Icon, tone } = look[isDir ? "directory" : getFileTypeCategory(file.name)];
  const size = !isDir && file.size > 0 ? humanizeFileSize(file.size) : "—";
  const modified = dateFormat.format(new Date(file.modify));

  const open = () => {
    if (isDir) actions.navigate(file.path);
    else if (isLogViewerFile(file)) actions.openLog(file);
    else if (canEditFile(file.name)) actions.edit?.(file);
  };

  const onClick = (event: MouseEvent) => {
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    // Any modifier means selection, an active selection turns plain clicks into selection too
    if (ctrl || shift || selectionMode) onSelect(index, file, { ctrl, shift });
    else open();
  };

  const copyPath = () => {
    void navigator.clipboard.writeText(file.path);
    notify({ title: tNotify("pathCopied"), type: "success" });
  };

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && open()}
      className="h-[54px] cursor-pointer outline-none [contain-intrinsic-size:auto_54px] [content-visibility:auto] focus-visible:bg-hover"
    >
      <TableCell className="w-10 pr-0" onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selected}
          tabIndex={-1}
          aria-label={file.name}
          onCheckedChange={() => onSelect(index, file, { ctrl: true, shift: false })}
          onClick={(event) => {
            if (!event.shiftKey) return;
            event.preventDefault();
            onSelect(index, file, { ctrl: true, shift: true });
          }}
        />
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <Plate tone={tone} size="sm">
            <Icon />
          </Plate>
          <div className="min-w-0">
            <div className="truncate font-medium">{file.name}</div>
            {pathHint && <div className="truncate text-xs text-muted-foreground">{pathHint}</div>}
            <div className="truncate text-xs text-muted-foreground @xl/table:hidden">
              {/* Folders have no size, just the date */}
              {isDir ? modified : `${size} · ${modified}`}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden w-28 text-muted-foreground tabular-nums @xl/table:table-cell">{size}</TableCell>
      <TableCell className="hidden w-36 text-muted-foreground tabular-nums @xl/table:table-cell">{modified}</TableCell>
      <TableCell className="w-12" onClick={(event) => event.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("menu")} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isDir && (
              <DropdownMenuItem onClick={open}>
                <Folder />
                {t("open")}
              </DropdownMenuItem>
            )}
            {!isDir && actions.edit && canEditFile(file.name) && (
              <DropdownMenuItem onClick={() => actions.edit?.(file)}>
                <Pencil />
                {t("edit")}
              </DropdownMenuItem>
            )}
            {!isDir && (
              <DropdownMenuItem onClick={() => actions.download(file)}>
                <Download />
                {t("download")}
              </DropdownMenuItem>
            )}
            {!isDir && actions.extract && /\.zip$/i.test(file.name) && (
              <DropdownMenuItem onClick={() => actions.extract?.(file)}>
                <FileArchive />
                {t("extract")}
              </DropdownMenuItem>
            )}
            {!isDir && isLogViewerFile(file) && (
              <DropdownMenuItem onClick={() => actions.openLog(file)}>
                <ScrollText />
                {t("openInLogViewer")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyPath}>
              <Copy />
              {t("copyPath")}
            </DropdownMenuItem>
            {actions.remove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => actions.remove?.(file)}>
                  <Trash2 />
                  {t("delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
