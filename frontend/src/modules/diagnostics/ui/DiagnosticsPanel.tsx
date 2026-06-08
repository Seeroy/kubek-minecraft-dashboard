"use client";
import { useServerStore } from "@/modules/server";
import { useServerStatus } from "@/modules/server/store/server-statuses.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { ServerStatus } from "@shared/types/server/server.types";
import { UserPermissions } from "@shared/types/user.types";
import { ShieldAlert } from "lucide-react";
import React from "react";
import { useDiagnostics } from "../hooks/useDiagnostics";
import DiagnosticItem from "./DiagnosticItem";

interface DiagnosticsPanelProps {
  /** Render nothing when there are no diagnostics */
  hideWhenEmpty?: boolean;
  /** Drop the outer card chrome + title (when the parent provides its own) */
  bare?: boolean;
  className?: string;
}

const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  hideWhenEmpty,
  bare,
  className,
}) => {
  const { t } = useTranslation("modules.diagnostics");
  const { selectedServer } = useServerStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasServerAccess = useAuthStore((s) => s.hasServerAccess);

  const serverId = selectedServer?.id;
  const { data } = useDiagnostics(serverId);
  const status = useServerStatus(serverId);

  if (!serverId || !hasServerAccess(serverId)) return null;

  // Drop diagnostics that predate the current run - once the server is up,
  // start-time errors (port bind, java mismatch, etc.) are no longer actionable
  const isRunning = status?.status === ServerStatus.RUNNING;
  const startedAt = status?.runtime?.startedAt
    ? new Date(status.runtime.startedAt).getTime()
    : null;
  const filtered = (data ?? []).filter((d) => {
    if (!isRunning) return true;
    if (!startedAt) return false;
    return new Date(d.timestamp).getTime() >= startedAt;
  });

  // Most recent first
  const diagnostics = [...filtered].reverse();
  if (hideWhenEmpty && diagnostics.length === 0) return null;

  const canControl = hasPermission(UserPermissions.SERVERS_CONTROL);

  return (
    <div
      className={cn(
        !bare && "rounded-xl border border-border/60 bg-card/40 p-4",
        className
      )}
    >
      {!bare && (
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <h3 className="font-medium">{t("title")}</h3>
          {diagnostics.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({diagnostics.length})
            </span>
          )}
        </div>
      )}

      {diagnostics.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {diagnostics.map((diagnostic, index) => (
            <DiagnosticItem
              key={`${diagnostic.timestamp}-${index}`}
              diagnostic={diagnostic}
              serverId={serverId}
              canControl={canControl}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiagnosticsPanel;
