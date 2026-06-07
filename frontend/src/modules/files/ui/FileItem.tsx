"use client";
import { isLogViewerFile } from "@/modules/files/lib/logFiles";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import { canEditFile, getFileTypeCategory } from "@/shared/lib/fileTypes";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { TableCell, TableRow } from "@/shared/ui/table";
import { FileType, IFile } from "@shared/types/file.types";
import {
  Archive,
  Copy,
  Download,
  Edit,
  FileArchive,
  FileText,
  FolderOpen,
  Image,
  MoreVertical,
  ScrollText,
  Terminal,
  Trash2,
} from "lucide-react";
import React from "react";

interface FileItemProps {
  file: IFile;
  index: number;
  onEdit?: (file: IFile) => void;
  onNavigate?: (path: string) => void;
  onDelete?: (file: IFile) => void;
  onDownload?: (file: IFile) => void;
  onExtract?: (file: IFile) => void;
  onOpenLogFile?: (file: IFile) => void;
  selected?: boolean;
  selectionMode?: boolean;
  // Called when the row (or its checkbox) is clicked with selection intent
  // Carries modifier state so the parent can implement Ctrl/Shift behavior
  onSelect?: (
    index: number,
    file: IFile,
    mods: { ctrl: boolean; shift: boolean }
  ) => void;
  // Containing folder path, shown under the name in global search results
  pathHint?: string;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  index,
  onEdit,
  onNavigate,
  onDelete,
  onDownload,
  onExtract,
  onOpenLogFile,
  selected = false,
  selectionMode = false,
  onSelect,
  pathHint,
}) => {
  const { t } = useTranslation("modules.files");
  const { notify } = useNotifications();
  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.path);
    notify({ title: t("notifications.success.pathCopied"), type: "success" });
  };
  const renderIcon = () => {
    if (file.type === FileType.FILE) {
      const fileCategory = getFileTypeCategory(file.name);

      let IconComponent = FileText;
      let bgColor = "bg-blue-500/10";
      let iconColor = "text-blue-500";

      switch (fileCategory) {
        case "image":
          IconComponent = Image;
          bgColor = "bg-purple-500/10";
          iconColor = "text-purple-500";
          break;
        case "archive":
          IconComponent = Archive;
          bgColor = "bg-orange-500/10";
          iconColor = "text-orange-500";
          break;
        case "script":
          IconComponent = Terminal;
          bgColor = "bg-green-500/10";
          iconColor = "text-green-500";
          break;
        case "text":
          IconComponent = FileText;
          bgColor = "bg-blue-500/10";
          iconColor = "text-blue-500";
          break;
        default:
          IconComponent = FileText;
          bgColor = "bg-gray-500/10";
          iconColor = "text-gray-500";
      }

      return (
        <div className={`p-2 ${bgColor} rounded-lg`}>
          <IconComponent className={`h-4 w-4 ${iconColor}`} />
        </div>
      );
    } else {
      return (
        <div className="rounded-lg bg-amber-500/10 p-2">
          <FolderOpen className="h-4 w-4 text-amber-500" />
        </div>
      );
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Treat any modifier as a selection intent. In active selectionMode, plain clicks also select
    if (ctrl || shift || selectionMode) {
      onSelect?.(index, file, { ctrl, shift });
      return;
    }
    if (file.type === FileType.DIRECTORY) {
      onNavigate?.(file.path);
    } else if (isLogViewerFile(file)) {
      onOpenLogFile?.(file);
    } else if (canEditFile(file.name)) {
      onEdit?.(file);
    }
  };

  return (
    <TableRow
      data-selected={selected || undefined}
      // content-visibility skips rendering rows scrolled out of view (i think this works)
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 53px" }}
      className="cursor-pointer bg-card/20 transition-colors hover:bg-card/60 data-[selected=true]:bg-primary/5"
      onClick={handleRowClick}
    >
      <TableCell
        className="w-10 pr-0 pl-4 align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() =>
            onSelect?.(index, file, { ctrl: true, shift: false })
          }
          onClick={(e) => {
            if (e.shiftKey) {
              e.preventDefault();
              onSelect?.(index, file, { ctrl: true, shift: true });
            }
          }}
          tabIndex={-1}
          aria-label="Select"
        />
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          {renderIcon()}
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{file.name}</span>
            {pathHint && (
              <span className="truncate text-xs text-muted-foreground">
                {pathHint}
              </span>
            )}
            <span className="truncate text-xs text-muted-foreground sm:hidden">
              {file.size > 0 ? humanizeFileSize(file.size) : "-"}
              {" · "}
              {file.modify.toLocaleDateString()}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {file.size > 0 ? (
          <div className="flex items-center gap-1">
            <span>{humanizeFileSize(file.size)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        <div className="flex flex-col">
          <span className="text-sm">{file.modify.toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground/70">
            {file.modify.toLocaleTimeString()}
          </span>
        </div>
      </TableCell>
      <TableCell className="pr-6">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {file.type === FileType.FILE && (
              <>
                {canEditFile(file.name) && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(file);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {t("ui.fileItem.actions.edit")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.(file);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("ui.fileItem.actions.download")}
                </DropdownMenuItem>
                {/\.zip$/i.test(file.name) && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onExtract?.(file);
                    }}
                  >
                    <FileArchive className="mr-2 h-4 w-4" />
                    {t("ui.fileItem.actions.extract")}
                  </DropdownMenuItem>
                )}
                {isLogViewerFile(file) && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLogFile?.(file);
                    }}
                  >
                    <ScrollText className="mr-2 h-4 w-4" />
                    {t("ui.fileItem.actions.openInLogViewer")}
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleCopyPath();
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t("ui.fileItem.actions.copyPath")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(file);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("ui.fileItem.actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(FileItem);
