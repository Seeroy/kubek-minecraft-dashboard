"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { PlayerHead } from "@/shared/ui/player-head";
import type { ReactNode } from "react";

export function PlayerCell({ name, sub }: { name: string | null; sub?: ReactNode }) {
  const { t } = useTranslation("modules.players.known");

  return (
    <div className="flex min-w-0 items-center gap-3">
      {name ? <PlayerHead name={name} size={32} className="shrink-0 rounded-md" /> : <span className="size-8 shrink-0 rounded-md bg-muted" />}
      <div className="min-w-0">
        <b className="block truncate font-semibold">{name ?? t("unknownName")}</b>
        {sub && <span className="block truncate font-mono text-[11.5px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
