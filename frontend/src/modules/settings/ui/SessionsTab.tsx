"use client";

import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import {
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useSessions,
} from "@/modules/settings/api/sessions.queries";
import { Badge } from "@/shared/ui/badge";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import type { SessionPublicView } from "@shared/types/session.types";
import { Globe, LogOut, Trash2 } from "lucide-react";

function describeUserAgent(
  ua: string | null,
  unknownDeviceLabel: string,
  unknownOsLabel: string
): string {
  if (!ua) return unknownDeviceLabel;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : unknownOsLabel;
  return `${browser} · ${os}`;
}

export default function SessionsTab() {
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.settings");
  const sessionsQuery = useSessions();
  const revokeMutation = useRevokeSessionMutation();
  const revokeOthersMutation = useRevokeOtherSessionsMutation();

  const sessions = sessionsQuery.data ?? [];
  const isBusy = revokeMutation.isPending || revokeOthersMutation.isPending;
  const otherSessionsCount = sessions.filter(
    (s: SessionPublicView) => !s.current
  ).length;

  const handleRevoke = (id: string) => {
    revokeMutation.mutate(id, {
      onSuccess: () =>
        notify({ title: t("sessions.notifications.revoked"), type: "success" }),
    });
  };

  const handleRevokeOthers = () => {
    revokeOthersMutation.mutate(undefined, {
      onSuccess: () =>
        notify({
          title: t("sessions.notifications.revokeOthers"),
          type: "success",
        }),
    });
  };

  if (sessionsQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BlockHeader
        kicker={t("sessions.header.kicker")}
        title={t("sessions.header.title")}
        description={t("sessions.header.description")}
        icon={Globe}
        color="blue"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeOthers}
            disabled={otherSessionsCount === 0 || isBusy}
            className="gap-2"
          >
            <LogOut className="h-3 w-3" />
            {t("sessions.buttons.signOutOther")}
          </Button>
        }
      />

      <div className="space-y-2">
        {sessions.map((session: SessionPublicView) => (
          <div
            key={session.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4 transition-colors duration-150 hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Globe className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {describeUserAgent(
                      session.userAgent,
                      t("sessions.labels.unknownDevice"),
                      t("sessions.labels.unknownOs")
                    )}
                  </span>
                  {session.current && (
                    <Badge variant="secondary" className="text-xs">
                      {t("sessions.labels.thisDevice")}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("sessions.labels.ip")}:{" "}
                  {session.ip ?? t("sessions.labels.unknown")} ·{" "}
                  {t("sessions.labels.lastSeen")}{" "}
                  {formatRelative(
                    session.lastSeenAt,
                    t("sessions.labels.justNow")
                  )}{" "}
                  · {t("sessions.labels.created")}{" "}
                  {formatRelative(
                    session.createdAt,
                    t("sessions.labels.justNow")
                  )}
                </div>
              </div>
            </div>

            {!session.current && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRevoke(session.id)}
                disabled={isBusy}
                className="flex-shrink-0 gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                {t("sessions.buttons.revoke")}
              </Button>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("sessions.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
