"use client";
import type { NetworkMember } from "@/api";
import { useServerStatus } from "@/modules/server/store/server-statuses.store";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { StatusDot } from "@/shared/ui/status-dot";
import { ArrowDown, ArrowUp, Unlink } from "lucide-react";

interface MemberRowProps {
  member: NetworkMember;
  isDefault: boolean;
  canUp: boolean;
  canDown: boolean;
  canLeaveTry: boolean;
  busy: boolean;
  onMove: (by: number) => void;
  onToggleTry: () => void;
  onRemove: () => void;
}

export function MemberRow({ member, isDefault, canUp, canDown, canLeaveTry, busy, onMove, onToggleTry, onRemove }: MemberRowProps) {
  const { t } = useTranslation("modules.networks");
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const blueprint = useBlueprint(member.blueprintId);
  // The socket keeps the store status fresher than the network list
  const status = useServerStatus(member.serverId, member.status);
  const inTry = member.tryOrder !== null;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover sm:flex-nowrap">
      <Checkbox
        checked={inTry}
        disabled={busy || (inTry && !canLeaveTry)}
        onCheckedChange={onToggleTry}
        aria-label={`${t("options.inTry")}: ${member.name}`}
        title={t("options.inTry")}
      />
      <ServerAvatar serverId={member.serverId} name={member.name} className="size-8 rounded-md" />
      <div className="min-w-44 flex-1">
        <div className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium">
          <span className="truncate">{member.name}</span>
          {isDefault && <Badge variant="success">{t("options.default")}</Badge>}
          {blueprint && <Badge variant="secondary">{blueprint.shortName ?? blueprint.name}</Badge>}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <StatusDot status={status} />
          <span>{tStatus(status)}</span>
          <span className="truncate font-mono text-[11.5px]" title={t("tab.address")}>
            {member.alias} {member.address}
          </span>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" disabled={busy || !canUp} onClick={() => onMove(-1)} aria-label={t("options.up")} title={t("options.up")}>
          <ArrowUp />
        </Button>
        <Button size="icon-sm" variant="ghost" disabled={busy || !canDown} onClick={() => onMove(1)} aria-label={t("options.down")} title={t("options.down")}>
          <ArrowDown />
        </Button>
        <Button size="icon-sm" variant="ghost" disabled={busy} onClick={onRemove} aria-label={t("tab.remove")} title={t("tab.remove")}>
          <Unlink />
        </Button>
      </div>
    </div>
  );
}
