"use client";
import type { AuditLogEntry } from "@/api";
import { useServerStore } from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Server } from "lucide-react";
import { useResourceLabel } from "../lib/labels";

/** Server of an entry under its current name, a deleted one keeps the logged name */
export function ServerLine({ id, name, className }: { id: string; name?: string | null; className?: string }) {
  const { t } = useTranslation("modules.auditLog.details");
  const live = useServerStore().servers.find((server) => server.id === id);
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)} title={live ? undefined : id}>
      {live ? (
        <ServerAvatar serverId={id} name={live.name} className="size-4 shrink-0 rounded-[4px]" />
      ) : (
        <Server className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{live?.name ?? name ?? id}</span>
      {!live && <span className="shrink-0 text-[11px] text-muted-foreground">({t("serverGone")})</span>}
    </span>
  );
}

/** Object of the action with its server underneath, inline packs both into one line */
export function AuditTarget({ entry, className, inline }: { entry: AuditLogEntry; className?: string; inline?: boolean }) {
  const object = useResourceLabel()(entry);
  if (!entry.serverId) {
    if (inline && !object) return null;
    return <span className={cn("block truncate text-muted-foreground", className)}>{object ?? "—"}</span>;
  }
  if (!object) return <ServerLine id={entry.serverId} name={entry.serverName} className={className} />;
  return (
    <span className={cn("min-w-0 leading-tight", inline ? "flex items-center gap-1.5" : "grid", className)}>
      <span className={cn("truncate", !inline && "text-foreground")}>{object}</span>
      {inline && <span aria-hidden>·</span>}
      <ServerLine id={entry.serverId} name={entry.serverName} className={inline ? undefined : "text-[11.5px] text-muted-foreground"} />
    </span>
  );
}
