"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Crown } from "lucide-react";
import type { RowPlayer } from "./PlayerRowMenu";

export function PlayerStatusBadges({ player, opLevel, whitelistOn }: { player: RowPlayer; opLevel?: number; whitelistOn: boolean }) {
  const { t } = useTranslation("modules.players");

  return (
    <div className="flex flex-wrap gap-1">
      {player.online && <Badge variant="success">{t("known.online")}</Badge>}
      {player.isOp && (
        <Badge variant="warning">
          <Crown />
          {opLevel ? t("online.op", opLevel) : t("badges.op")}
        </Badge>
      )}
      {player.isBanned && <Badge variant="destructive">{t("badges.banned")}</Badge>}
      {player.isWhitelisted && whitelistOn && <Badge variant="secondary">{t("online.whitelisted")}</Badge>}
    </div>
  );
}
