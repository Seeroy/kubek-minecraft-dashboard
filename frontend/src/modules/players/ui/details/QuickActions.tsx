"use client";
import type { PlayerGamemode } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Drumstick, Heart } from "lucide-react";
import type { usePlayerCommand } from "../../hooks/usePlayerCommand";
import { GAMEMODES } from "../../lib/player-details";

interface QuickActionsProps {
  name: string;
  gamemode: PlayerGamemode | null;
  command: ReturnType<typeof usePlayerCommand>;
}

export function QuickActions({ name, gamemode, command }: QuickActionsProps) {
  const { t } = useTranslation("modules.players.details");
  const { run, pending } = command;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select<PlayerGamemode> value={gamemode ?? undefined} onValueChange={(value) => value && void run({ kind: "gamemode", data: { name, gamemode: value } }, t("toasts.gamemode", name))}>
        <SelectTrigger aria-label={t("gamemode")} className="w-44" disabled={pending}>
          <SelectValue placeholder={t("gamemode")}>{(value: PlayerGamemode) => t(`gamemodes.${value}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {GAMEMODES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {t(`gamemodes.${mode}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" disabled={pending} onClick={() => void run({ kind: "heal", name }, t("toasts.healed", name))}>
        <Heart />
        {t("heal")}
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => void run({ kind: "feed", name }, t("toasts.fed", name))}>
        <Drumstick />
        {t("feed")}
      </Button>
    </div>
  );
}
