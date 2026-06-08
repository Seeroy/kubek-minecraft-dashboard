"use client";
import { useBackupsByServer } from "@/modules/backups/api/backups.queries";
import { DiagnosticsPanel } from "@/modules/diagnostics";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { formatRelative } from "@/shared/lib/formatRelative";
import { useAuthStore } from "@/shared/stores/auth-store";
import { UserPermissions } from "@shared/types/user.types";
import type { LucideIcon } from "lucide-react";
import { Archive, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";

function SectionHeader({
  icon: Icon,
  plate,
  label,
  badge,
}: {
  icon: LucideIcon;
  plate: string;
  label: string;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          plate
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {badge}
    </div>
  );
}

export default function DiagnosticsBackupsWidget() {
  const { t } = useTranslation("modules.dashboard");
  const { selectedServer } = useServerStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canBackups = hasPermission(UserPermissions.BACKUPS);

  const { data: backups } = useBackupsByServer(
    canBackups ? selectedServer?.id : undefined
  );

  return (
    <div className="space-y-4">
      <section>
        <SectionHeader
          icon={Stethoscope}
          plate="bg-primary/10 text-primary ring-primary/20"
          label={t("widgets.diagnostics")}
        />
        <DiagnosticsPanel bare />
      </section>

      {canBackups ? (
        <section>
          <SectionHeader
            icon={Archive}
            plate="bg-blue-500/10 text-blue-500 ring-blue-500/20"
            label={t("recentBackups")}
            badge={
              backups && backups.length > 0 ? (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {backups.length}
                </span>
              ) : null
            }
          />
          {backups && backups.length > 0 ? (
            <ul className="space-y-1.5">
              {backups.slice(0, 4).map((backup) => (
                <li
                  key={backup.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card/40 px-2.5 py-2 transition-colors hover:border-border"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                    <Archive className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{backup.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatBytes(backup.totalSize)} ·{" "}
                      {formatRelative(backup.createdAt, t("justNow"))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noBackups")}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
