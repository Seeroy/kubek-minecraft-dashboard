"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { PlayerHead } from "@/shared/ui/player-head";

export function PlayerIdentity({ name, uuid, online }: { name: string | null; uuid: string; online: boolean }) {
  const { t } = useTranslation("modules.players.details");

  return (
    <div className="flex items-center gap-3">
      {name ? <PlayerHead name={name} size={40} className="rounded-md" /> : <span className="size-10 shrink-0 rounded-md bg-muted" />}
      <div className="min-w-0">
        <DialogTitle className="flex items-center gap-2">
          <span className="truncate">{name ?? t("unknownName")}</span>
          {online && <Badge variant="success">{t("online")}</Badge>}
        </DialogTitle>
        <DialogDescription className="truncate font-mono text-[11.5px]">{uuid}</DialogDescription>
      </div>
    </div>
  );
}
