"use client";
import type { PlayerPosition } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { Drumstick, Gamepad2, Heart, HeartPulse, MapPin, Skull, Sparkles } from "lucide-react";
import { dimensionLabel, formatNumber, type PlayerStateView } from "../../lib/player-details";
import { DetailsSection } from "./DetailsSection";
import { IconLabel } from "./IconLabel";

export function PlayerState({ details }: { details: PlayerStateView }) {
  const { t } = useTranslation("modules.players.details");
  const { gamemode, health, food, xpLevel, position, lastDeath } = details;
  if (!gamemode && health === null && !position) return null;

  const place = (at: PlayerPosition) =>
    `${dimensionLabel(t, at.dimension)}, ${formatNumber(at.x, 1)} / ${formatNumber(at.y, 1)} / ${formatNumber(at.z, 1)}`;

  return (
    <DetailsSection title={t("state")} icon={HeartPulse} tone="red">
      <KeyValue>
        {gamemode && (
          <KeyValueItem label={<IconLabel icon={Gamepad2} tone="blue">{t("gamemode")}</IconLabel>}>{t(`gamemodes.${gamemode}`)}</KeyValueItem>
        )}
        {health !== null && (
          <KeyValueItem label={<IconLabel icon={Heart} tone="red">{t("health")}</IconLabel>}>{`${formatNumber(health, 1)} / 20`}</KeyValueItem>
        )}
        {food !== null && <KeyValueItem label={<IconLabel icon={Drumstick} tone="amber">{t("food")}</IconLabel>}>{`${food} / 20`}</KeyValueItem>}
        {xpLevel !== null && <KeyValueItem label={<IconLabel icon={Sparkles} tone="green">{t("level")}</IconLabel>}>{xpLevel}</KeyValueItem>}
        {position && <KeyValueItem label={<IconLabel icon={MapPin} tone="cyan">{t("position")}</IconLabel>}>{place(position)}</KeyValueItem>}
        {lastDeath && <KeyValueItem label={<IconLabel icon={Skull} tone="gray">{t("lastDeath")}</IconLabel>}>{place(lastDeath)}</KeyValueItem>}
      </KeyValue>
    </DetailsSection>
  );
}
