"use client";

import { getStatusBadgeVariant, getStatusIcon } from "@/modules/backups/utils";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { humanizeFileSize } from "@/shared/lib/bytesToGb";
import { ModalProps } from "@/shared/types/modal.types";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader } from "@/shared/ui/dialog";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { Backup } from "@shared/types/backup.types";
import {
  Calendar,
  Clock,
  Database,
  FileText,
  HardDrive,
  Package,
  Server,
} from "lucide-react";

export interface BackupInfoModalProps extends ModalProps {
  backup?: Backup;
}

export function BackupInfoModal({
  isOpen,
  onClose,
  backup,
}: BackupInfoModalProps) {
  const { t } = useTranslation("modules.backups");

  if (!backup) {
    return null;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-y-auto">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{backup.name}</h3>
              {backup.description && (
                <p className="text-sm text-muted-foreground">
                  {backup.description}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(backup.status)}
                <Badge variant={getStatusBadgeVariant(backup.status)}>
                  {backup.status}
                </Badge>
                <Badge variant="outline">
                  {backup.type === "full"
                    ? t("modals.backupInfo.types.full")
                    : t("modals.backupInfo.types.partial")}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Backup Details */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("modals.backupInfo.sections.created")}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm">
                    {new Date(backup.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(backup.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("modals.backupInfo.sections.sizeAndFiles")}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm">
                    {humanizeFileSize(backup.totalSize)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("modals.backupInfo.fileCount", backup.fileCount)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("modals.backupInfo.sections.format")}
                  </span>
                </div>
                <div>
                  <Badge variant="secondary">
                    {backup.format === "tar.gz"
                      ? t("modals.backupInfo.formats.tarGz")
                      : t("modals.backupInfo.formats.zip")}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("modals.backupInfo.sections.serverId")}
                  </span>
                </div>
                <div>
                  <p className="font-mono text-sm text-xs">{backup.serverId}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Information */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                {t("modals.backupInfo.sections.additionalInfo")}
              </h4>

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">
                    {t("modals.backupInfo.sections.backupId")}
                  </span>
                  <p className="mt-1 font-mono text-xs break-all">
                    {backup.id}
                  </p>
                </div>

                {backup.path && (
                  <div>
                    <span className="text-muted-foreground">
                      {t("modals.backupInfo.sections.path")}
                    </span>
                    <p className="mt-1 font-mono text-xs break-all">
                      {backup.path}
                    </p>
                  </div>
                )}

                {backup.compressionRatio && (
                  <div>
                    <span className="text-muted-foreground">
                      {t("modals.backupInfo.sections.compressionRatio")}
                    </span>
                    <p className="mt-1">
                      {t(
                        "modals.backupInfo.sections.compressionRatioValue",
                        backup.compressionRatio
                      )}
                    </p>
                  </div>
                )}

                {backup.globExceptions && backup.globExceptions.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">
                      {t("modals.backupInfo.sections.excludedPatterns")}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {backup.globExceptions.map((pattern, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            {backup.updatedAt && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    {t("modals.backupInfo.sections.timestamps")}
                  </h4>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">
                        {t("modals.backupInfo.sections.lastUpdated")}
                      </span>
                      <p className="mt-1">
                        {t(
                          "modals.backupInfo.lastUpdatedFormat",
                          new Date(backup.updatedAt).toLocaleDateString(),
                          new Date(backup.updatedAt).toLocaleTimeString()
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
