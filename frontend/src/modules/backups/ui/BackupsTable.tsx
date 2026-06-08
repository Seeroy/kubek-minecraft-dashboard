import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Backup } from "@shared/types/backup.types";
import { BackupsTableRow } from "./BackupsTableRow";

interface BackupsTableProps {
  backups: Backup[];
  onDownload: (backup: Backup) => void;
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
  onInfo: (backup: Backup) => void;
}

export const BackupsTable = ({
  backups,
  onDownload,
  onRestore,
  onDelete,
  onInfo,
}: BackupsTableProps) => {
  const { t } = useTranslation("modules.backups");
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="max-h-[72vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-card">
              <TableHead className="pl-13 text-foreground/70">
                {t("table.headers.name")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.type")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.status")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.created")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.size")}
              </TableHead>
              <TableHead className="text-foreground/70">
                {t("table.headers.files")}
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((backup) => (
              <BackupsTableRow
                key={backup.id}
                backup={backup}
                onDownload={onDownload}
                onRestore={onRestore}
                onDelete={onDelete}
                onInfo={onInfo}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
