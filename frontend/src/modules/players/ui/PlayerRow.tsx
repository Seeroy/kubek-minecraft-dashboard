"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { CopyButton } from "@/shared/ui/CopyButton";
import { PlayerHead } from "@/shared/ui/player-head";
import type { ReactNode } from "react";

interface PlayerRowProps {
  name: string;
  /** Second line, the UUID for players or a ban detail for addresses */
  uuid?: string;
  head?: ReactNode;
  badges?: ReactNode;
  detail?: ReactNode;
  actions?: ReactNode;
}

export function PlayerRow({ name, uuid, head, badges, detail, actions }: PlayerRowProps) {
  const { t } = useTranslation("modules.players.uuid");

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover">
      {head ?? <PlayerHead name={name} size={32} className="rounded-md" />}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium max-sm:flex-wrap max-sm:gap-y-1">
          <span className="truncate">{name}</span>
          {badges}
        </div>
        {uuid !== undefined && (
          <div className="flex min-w-0 items-center gap-1 text-muted-foreground">
            <span className="truncate font-mono text-[11.5px]">{uuid || t("none")}</span>
            {uuid && (
              <CopyButton
                value={uuid}
                title={t("copy")}
                className="size-5 shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
                iconClassName="size-3"
              />
            )}
          </div>
        )}
        {detail && <div className="truncate text-xs text-muted-foreground">{detail}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </div>
  );
}
