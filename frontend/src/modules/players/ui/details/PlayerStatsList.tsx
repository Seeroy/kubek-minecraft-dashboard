"use client";
import type { PlayerStats } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { ArrowBigUp, ChartColumn, Clock, Crosshair, Footprints, Skull, Swords } from "lucide-react";
import { CM_PER_KM, formatNumber, TICKS_PER_HOUR } from "../../lib/player-details";
import { DetailsSection } from "./DetailsSection";
import { IconLabel } from "./IconLabel";

export function PlayerStatsList({ stats }: { stats: PlayerStats }) {
  const { t } = useTranslation("modules.players.details");

  return (
    <DetailsSection title={t("stats")} icon={ChartColumn} tone="purple">
      <KeyValue>
        <KeyValueItem label={<IconLabel icon={Clock} tone="blue">{t("playTime")}</IconLabel>}>
          {t("hours", formatNumber(stats.playTimeTicks / TICKS_PER_HOUR, 1))}
        </KeyValueItem>
        <KeyValueItem label={<IconLabel icon={Footprints} tone="green">{t("distance")}</IconLabel>}>
          {t("km", formatNumber(stats.distanceCm / CM_PER_KM, 1))}
        </KeyValueItem>
        <KeyValueItem label={<IconLabel icon={Skull} tone="gray">{t("deaths")}</IconLabel>}>{formatNumber(stats.deaths)}</KeyValueItem>
        <KeyValueItem label={<IconLabel icon={Swords} tone="orange">{t("mobKills")}</IconLabel>}>{formatNumber(stats.mobKills)}</KeyValueItem>
        <KeyValueItem label={<IconLabel icon={Crosshair} tone="red">{t("playerKills")}</IconLabel>}>{formatNumber(stats.playerKills)}</KeyValueItem>
        <KeyValueItem label={<IconLabel icon={ArrowBigUp} tone="cyan">{t("jumps")}</IconLabel>}>{formatNumber(stats.jumps)}</KeyValueItem>
      </KeyValue>
    </DetailsSection>
  );
}
