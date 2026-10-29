"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { CopyButton } from "@/shared/ui/CopyButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { Plate } from "@/shared/ui/plate";
import { KeyRound } from "lucide-react";

/** New FTP password, shown only once */
export function FtpPasswordRevealDialog({ login, password, onClose }: { login: string; password: string; onClose: () => void }) {
  const { t } = useTranslation("modules.settings.general.ftp.reveal");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="green">
            <KeyRound />
          </Plate>
          <div>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>
        <KeyValue className="rounded-md border border-dashed border-border bg-subtle px-4 py-3 [&_dd]:text-left [&_dd]:font-mono [&_dd]:text-[12.5px]">
          <KeyValueItem label={t("login")}>{login}</KeyValueItem>
          <KeyValueItem label={t("password")}>
            <span className="inline-flex items-center gap-1 break-all">
              {password}
              <CopyButton value={password} title={t("copy")} />
            </span>
          </KeyValueItem>
        </KeyValue>
        <DialogFooter>
          <Button onClick={onClose}>{t("done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
