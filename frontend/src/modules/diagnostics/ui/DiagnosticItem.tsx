"use client";
import { api } from "@/api";
import type { Translator } from "@/locales/types";
import { useNotifications } from "@/modules/notifications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { IServerDiagnostic } from "@shared/types/server/instance.types";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { getDiagnosticFixes } from "../lib/diagnosticFixes";

// Error types known to have localized title/description in the diagnostics namespace
const KNOWN_ERROR_TYPES = new Set([
  "out_of_memory",
  "port_bind_failed",
  "world_corruption",
  "plugin_error",
  "disk_space",
  "network_error",
  "configuration_error",
  "java_version_incompatible",
  "file_permission_error",
  "mod_conflict",
  "server_unresponsive",
]);

interface DiagnosticItemProps {
  diagnostic: IServerDiagnostic;
  serverId: string;
  /** Whether the user may run control actions */
  canControl: boolean;
  t: Translator;
}

const severityVariant: Record<string, "destructive" | "secondary" | "outline"> =
  {
    critical: "destructive",
    high: "destructive",
    medium: "secondary",
    low: "outline",
  };

const DiagnosticItem: React.FC<DiagnosticItemProps> = ({
  diagnostic,
  serverId,
  canControl,
  t,
}) => {
  const router = useRouter();
  const { notify } = useNotifications();
  const [confirmRestart, setConfirmRestart] = useState(false);

  const errorKey = KNOWN_ERROR_TYPES.has(diagnostic.errorType)
    ? diagnostic.errorType
    : "unknown";
  const definition = {
    title: t(`errors.${errorKey}.title`),
    description: t(`errors.${errorKey}.description`),
  };
  const fixes = getDiagnosticFixes(diagnostic.errorType);

  const handleRestart = async () => {
    setConfirmRestart(false);
    try {
      await api.servers.restart(serverId);
    } catch {
      notify({ title: t("restartFailed"), type: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{definition.title}</span>
            <Badge variant={severityVariant[diagnostic.severity] ?? "outline"}>
              {t(`severity.${diagnostic.severity}`)}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {definition.description}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {new Date(diagnostic.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pl-7">
        {fixes.map((fix, index) => {
          if (fix.type === "restart") {
            if (!canControl) return null;
            return (
              <Button
                key={index}
                size="sm"
                variant="secondary"
                onClick={() => setConfirmRestart(true)}
              >
                <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                {t(fix.labelKey)}
              </Button>
            );
          }
          return (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => router.push(fix.href)}
            >
              {t(fix.labelKey)}
            </Button>
          );
        })}
      </div>

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restartConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("restartConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("restartConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart}>
              {t("restartConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DiagnosticItem;
