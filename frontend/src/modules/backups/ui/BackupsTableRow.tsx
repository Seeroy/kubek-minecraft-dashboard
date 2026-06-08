import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { TableCell, TableRow } from "@/shared/ui/table";
import { Backup, BackupStatus } from "@shared/types/backup.types";
import { Archive, Download, MoreVertical, Play, Trash2 } from "lucide-react";
import { getStatusBadgeVariant, getStatusIcon } from "../utils";

interface BackupsTableRowProps {
  backup: Backup;
  onDownload: (backup: Backup) => void;
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
  onInfo: (backup: Backup) => void;
}

export const BackupsTableRow = ({
  backup,
  onDownload,
  onRestore,
  onDelete,
  onInfo,
}: BackupsTableRowProps) => {
  const { t } = useTranslation("modules.backups");
  const getTypeBadgeVariant = (type: string) => {
    return type === "full" ? "default" : "secondary";
  };

  return (
    <TableRow
      className="cursor-pointer bg-card/20 transition-colors hover:bg-card/60"
      onClick={() => onInfo(backup)}
    >
      <TableCell>
        <div className="flex items-center gap-3 pl-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Archive className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{backup.name}</div>
            {backup.description && (
              <div className="text-sm text-muted-foreground">
                {backup.description}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getTypeBadgeVariant(backup.type)}>
          {backup.type === "full"
            ? t("table.types.full")
            : t("table.types.partial")}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getStatusIcon(backup.status)}
          <Badge variant={getStatusBadgeVariant(backup.status)}>
            {t(`filters.status.${backup.status}`)}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm">
            {new Date(backup.createdAt).toLocaleDateString()}
          </span>
          <span className="text-xs text-muted-foreground/70">
            {new Date(backup.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {humanizeFileSize(backup.totalSize)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {backup.fileCount}
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
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDownload(backup);
              }}
              disabled={backup.status !== BackupStatus.COMPLETED}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("table.actions.download")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRestore(backup);
              }}
              disabled={backup.status !== BackupStatus.COMPLETED}
            >
              <Play className="mr-2 h-4 w-4" />
              {t("table.actions.restore")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(backup);
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("table.actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
