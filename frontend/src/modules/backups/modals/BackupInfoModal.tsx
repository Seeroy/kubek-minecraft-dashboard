"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import type { ModalProps } from "@/shared/types/modal.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { Plate } from "@/shared/ui/plate";
import type { Tone } from "@/shared/ui/tone";
import { BackupStatus, type Backup } from "@shared/types/backup.types";
import { AlertTriangle, Archive, Check, Clock, Download, HardDrive, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { useBackupActions } from "../hooks/useBackups";
import { BackupCopiesList } from "./BackupCopiesList";
import { dateParts, typeLook } from "../lib/look";

export interface BackupInfoProps {
  backup: Backup;
  actions: ReturnType<typeof useBackupActions>;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "backups/info": { props: BackupInfoProps; result: void };
  }
}

type BackupInfoModalProps = ModalProps & BackupInfoProps;

const statusTone: Record<BackupStatus, Tone> = {
  [BackupStatus.COMPLETED]: "green",
  [BackupStatus.CREATING]: "blue",
  [BackupStatus.FAILED]: "red",
};

function InfoCell({ icon: Icon, tone, label, children }: { icon: LucideIcon; tone: Tone; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-subtle p-3">
      <Plate tone={tone} size="sm">
        <Icon />
      </Plate>
      <div className="min-w-0">
        <div className="label-caps">{label}</div>
        <div className="truncate text-[13.5px] font-semibold">{children}</div>
      </div>
    </div>
  );
}

function BackupInfoModal({ isOpen, onClose, backup, actions }: BackupInfoModalProps) {
  const { t } = useTranslation("modules.backups");
  const { icon: TypeIcon, tone } = typeLook[backup.type];
  const [date, time] = dateParts(backup.createdAt);
  const completed = backup.status === BackupStatus.COMPLETED;

  // The confirm dialog takes over, so this one steps aside first
  const run = (action: (backup: Backup) => void) => () => {
    onClose();
    action(backup);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone={tone}>
            <TypeIcon />
          </Plate>
          <div className="min-w-0">
            <DialogTitle className="truncate">{backup.name}</DialogTitle>
            <DialogDescription className="truncate">
              {t(`type.${backup.type}`)}
              {backup.description && ` · ${backup.description}`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCell icon={Clock} tone="cyan" label={t("info.created")}>
              {t("info.createdAt", date, time)}
            </InfoCell>
            <InfoCell icon={HardDrive} tone="purple" label={t("info.sizeAndFiles")}>
              {backup.totalSize ? formatBytes(backup.totalSize) : "—"} · {backup.fileCount ? t("files", backup.fileCount) : "—"}
            </InfoCell>
            <InfoCell icon={Archive} tone="orange" label={t("info.format")}>
              {(backup.format ?? "zip").toUpperCase()}
              {backup.compressionRatio ? ` · ${t("info.compression", backup.compressionRatio)}` : ""}
            </InfoCell>
            <InfoCell icon={backup.status === BackupStatus.FAILED ? AlertTriangle : Check} tone={statusTone[backup.status]} label={t("info.status")}>
              {t(`status.${backup.status}`)}
            </InfoCell>
          </div>

          <KeyValue>
            <KeyValueItem label={t("info.backupId")}>
              <span className="font-mono text-xs">{backup.id}</span>
            </KeyValueItem>
            <KeyValueItem label={t("info.serverId")}>
              <span className="font-mono text-xs">{backup.serverId}</span>
            </KeyValueItem>
            {backup.checksum && (
              <KeyValueItem label={t("info.checksum")}>
                <span className="font-mono text-xs break-all" title={backup.checksum}>
                  {backup.checksum.slice(0, 16)}…
                </span>
              </KeyValueItem>
            )}
            {backup.updatedAt !== backup.createdAt && (
              <KeyValueItem label={t("info.updated")}>{t("info.createdAt", ...dateParts(backup.updatedAt))}</KeyValueItem>
            )}
          </KeyValue>

          {backup.copies.length > 0 && (
            <section className="grid gap-2">
              <div className="label-caps">{t("info.copies")}</div>
              <BackupCopiesList backup={backup} />
            </section>
          )}

          {!!backup.globExceptions?.length && (
            <section className="grid gap-2">
              <div className="label-caps">{t("info.excluded")}</div>
              <div className="flex flex-wrap gap-1.5">
                {backup.globExceptions.map((pattern) => (
                  <Badge key={pattern} variant="secondary" className="font-mono">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {!!backup.selectedFiles?.length && (
            <section className="grid gap-2">
              <div className="label-caps">{t("info.selected")}</div>
              <div className="flex flex-wrap gap-1.5">
                {backup.selectedFiles.map((file) => (
                  <Badge key={file.path} variant="secondary" className="font-mono">
                    {file.path}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </DialogBody>

        <DialogFooter>
          {actions.canManage && (
            <Button variant="destructive" className="sm:mr-auto" disabled={backup.status === BackupStatus.CREATING} onClick={run(actions.remove)}>
              <Trash2 />
              {t("actions.delete")}
            </Button>
          )}
          <Button variant="outline" disabled={!completed} onClick={() => actions.download(backup)}>
            <Download />
            {t("actions.download")}
          </Button>
          {actions.canManage && (
            <Button disabled={!completed} onClick={run(actions.restore)}>
              <RotateCcw />
              {t("actions.restore")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const BACKUP_INFO_MODAL_ID = "backups/info";

export function BackupInfoModalRegistration() {
  useThisModal({
    id: BACKUP_INFO_MODAL_ID,
    component: BackupInfoModal,
    module: "backups",
  });

  return null;
}
