"use client";
import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Spinner } from "@/shared/ui/spinner";
import type { AuditLogQuery } from "@shared/types/audit.types";
import { Braces, Download, Sheet } from "lucide-react";
import { useState } from "react";

const FORMATS = [
  { format: "json", icon: Braces },
  { format: "csv", icon: Sheet },
] as const;

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads everything the current filters match, not just the page on screen */
export function AuditExportButton({ filters, total }: { filters: AuditLogQuery; total: number }) {
  const { t } = useTranslation("modules.auditLog.export");
  const { notify } = useNotifications();
  const [busy, setBusy] = useState(false);

  const run = async (format: "json" | "csv") => {
    setBusy(true);
    try {
      const { blob, filename } = await api.auditLog.export(filters, format);
      save(blob, filename);
      notify({ type: "success", title: t("done", total) });
    } catch (error) {
      notify({ type: "error", title: t("failed"), message: getApiErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={busy || total === 0} title={total === 0 ? t("nothing") : undefined}>
            {busy ? <Spinner /> : <Download />}
            {t("button")}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("label", total)}</DropdownMenuLabel>
          {FORMATS.map(({ format, icon: Icon }) => (
            <DropdownMenuItem key={format} onClick={() => void run(format)}>
              <Icon />
              <span className="grid">
                <span>{t(`formats.${format}.title`)}</span>
                <small className="text-xs text-muted-foreground">{t(`formats.${format}.hint`)}</small>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
