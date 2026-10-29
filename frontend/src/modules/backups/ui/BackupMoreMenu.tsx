"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { type Backup, BackupCopyStatus, type BackupStorage } from "@shared/types/backup.types";
import { CloudUpload, MoreHorizontal, Pin, PinOff } from "lucide-react";
import type { useBackupActions } from "../hooks/useBackups";

interface BackupMoreMenuProps {
  backup: Backup;
  storages: BackupStorage[];
  actions: ReturnType<typeof useBackupActions>;
  disabled: boolean;
}

export function BackupMoreMenu({ backup, storages, actions, disabled }: BackupMoreMenuProps) {
  const { t } = useTranslation("modules.backups");
  const uploaded = (storageId: string) => backup.copies.some((c) => c.storageId === storageId && c.status !== BackupCopyStatus.FAILED);
  const hasLocal = backup.copies.some((c) => c.storageId === null && c.status === BackupCopyStatus.READY);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" disabled={disabled} title={t("more")} aria-label={t("more")} />}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!hasLocal}>
            <CloudUpload />
            {t("upload.title")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {storages.length === 0 ? (
              <DropdownMenuItem disabled>{t("upload.none")}</DropdownMenuItem>
            ) : (
              storages.map((storage) => (
                <DropdownMenuItem key={storage.id} disabled={uploaded(storage.id)} onClick={() => actions.upload(backup, storage.id)}>
                  {storage.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => actions.togglePin(backup)}>
          {backup.pinned ? <PinOff /> : <Pin />}
          {backup.pinned ? t("unpin") : t("pin")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
