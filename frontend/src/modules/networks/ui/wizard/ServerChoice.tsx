"use client";
import type { NetworkServerRef } from "@/api";
import { useServerStatus } from "@/modules/server/store/server-statuses.store";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { StatusDot } from "@/shared/ui/status-dot";
import type { ReactNode } from "react";

interface ServerChoiceProps {
  server: NetworkServerRef;
  selected: boolean;
  onToggle: () => void;
  /** Checkbox for multi select, a pressed row otherwise */
  multiple?: boolean;
  badges?: ReactNode;
}

/** A panel server the wizard can pick */
export function ServerChoice({ server, selected, onToggle, multiple, badges }: ServerChoiceProps) {
  const { t } = useTranslation("modules.components.serverStatus");
  const blueprint = useBlueprint(server.blueprintId);
  // The list is a snapshot, status comes live from the socket
  const status = useServerStatus(server.serverId, server.status);

  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-[border-color,background-color] duration-150 ease-smooth outline-none hover:border-foreground/20 focus-visible:border-primary/60 aria-checked:border-primary/60 aria-checked:bg-primary/6"
    >
      {multiple && <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none" />}
      <ServerAvatar serverId={server.serverId} name={server.name} className="size-8 rounded-md" />
      <span className="grid min-w-0 flex-1">
        <b className="truncate text-[13.5px] font-semibold">{server.name}</b>
        <span className="truncate text-xs text-muted-foreground">
          {blueprint?.shortName ?? blueprint?.name ?? server.blueprintId}, {t(status)}
        </span>
      </span>
      {badges}
      <StatusDot status={status} />
    </button>
  );
}

export function ModeBadges({ modes }: { modes: string[] }) {
  const { t } = useTranslation("modules.networks.backends.modes");
  return (
    <span className="flex shrink-0 gap-1">
      {modes.map((mode) => (
        <Badge key={mode} variant="secondary">
          {t(mode)}
        </Badge>
      ))}
    </span>
  );
}
