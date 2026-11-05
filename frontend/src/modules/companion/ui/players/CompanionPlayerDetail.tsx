"use client";

import type { CompanionPlayer } from "@/api";
import { formatDuration } from "@/shared/lib/formatDuration";
import { useNow } from "@/shared/hooks/useNow";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { toneClass } from "@/shared/ui/tone";
import { pingTone } from "../../lib/health";

/** World, mode, ping and session length under an online player's name */
export function CompanionPlayerDetail({ player }: { player: CompanionPlayer }) {
  const { t } = useTranslation("modules.companion.players");
  const { t: tComponents } = useTranslation("modules.components");
  const now = useNow();
  const session = player.since && now ? (now - player.since) / 1000 : null;
  const coords = player.x != null && player.z != null ? `${Math.round(player.x)}, ${Math.round(player.y ?? 0)}, ${Math.round(player.z)}` : null;

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3">
      <span>{player.world}</span>
      <span>{t(`gamemode.${player.gamemode}`)}</span>
      {player.ping != null && <span className={`${toneClass[pingTone(player.ping)]} text-tone tabular-nums`}>{t("ping", player.ping)}</span>}
      {session != null && <span>{t("session", formatDuration(session, tComponents))}</span>}
      {coords && <span className="font-mono">{coords}</span>}
    </span>
  );
}
