"use client";

import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import { SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import type { SessionPublicView } from "@shared/types/session.types";
import { Globe, LogOut, Monitor, Smartphone } from "lucide-react";
import { useRevokeOtherSessionsMutation, useRevokeSessionMutation, useSessions } from "../api/sessions.queries";

const MOBILE = /Android|iPhone|iPad/;

function describeAgent(ua: string | null, unknownDevice: string, unknownOs: string) {
  if (!ua) return unknownDevice;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : unknownOs;
  return `${browser} · ${os}`;
}

export default function SessionsTab() {
  const { t } = useTranslation("modules.settings.sessions");
  const { t: tc } = useTranslation("modules.components");
  const { notify } = useNotifications();
  const sessions = useSessions();
  const revoke = useRevokeSessionMutation();
  const revokeOthers = useRevokeOtherSessionsMutation();
  const list = sessions.data ?? [];
  const busy = revoke.isPending || revokeOthers.isPending;
  const others = list.filter((session) => !session.current).length;
  const relative = (timestamp: number) => formatRelative(timestamp, tc("justNow"));

  return (
    <SettingsGroup tone="cyan" icon={Globe} title={t("title")} description={t("description")} flush>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground tabular-nums">{t("count", list.length)}</span>
        <Button
          variant="destructive"
          size="sm"
          className="ml-auto"
          disabled={others === 0 || busy}
          onClick={() => revokeOthers.mutate(undefined, { onSuccess: () => notify({ type: "success", title: t("toasts.revokedOthers") }) })}
        >
          <LogOut />
          {t("revokeOthers")}
        </Button>
      </div>

      {sessions.isLoading ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : list.length === 0 ? (
        <p className="p-6 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y divide-border">
          {list.map((session: SessionPublicView) => (
            <div key={session.id} className="flex items-center gap-3 px-4 py-3">
              <Plate tone={session.current ? "green" : "blue"}>
                {session.userAgent && MOBILE.test(session.userAgent) ? <Smartphone /> : <Monitor />}
              </Plate>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13.5px] font-medium">
                  <span className="truncate">{describeAgent(session.userAgent, t("unknownDevice"), t("unknownOs"))}</span>
                  {session.current && <Badge variant="success">{t("thisDevice")}</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {t("details", session.ip ?? t("unknown"), relative(session.lastSeenAt), relative(session.createdAt))}
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => revoke.mutate(session.id, { onSuccess: () => notify({ type: "success", title: t("toasts.revoked") }) })}
                >
                  {t("revoke")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </SettingsGroup>
  );
}
