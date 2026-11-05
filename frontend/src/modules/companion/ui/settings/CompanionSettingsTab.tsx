"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";
import { Activity, DoorOpen, MapPin, MessageSquare, Skull, UserX, type LucideIcon } from "lucide-react";
import { useCompanion } from "../../hooks/useCompanion";
import { FEED_SETTINGS, useCompanionSettings, type CompanionSettingKey } from "../../hooks/useCompanionSettings";
import { CompanionBanner } from "../CompanionBanner";
import { MaintenanceGroup } from "./MaintenanceGroup";

const ICONS: Record<CompanionSettingKey, LucideIcon> = {
  sessions: DoorOpen,
  kicks: UserX,
  deaths: Skull,
  chat: MessageSquare,
  coords: MapPin,
};

/** Server settings tab: what the plugin collects and maintenance mode */
export function CompanionSettingsTab({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.companion.settings");
  const { state, overview } = useCompanion(serverId);
  const { settings, canEdit, pending, toggle } = useCompanionSettings(serverId);

  if (!overview || !settings) return <Skeleton className="h-96 rounded-lg" />;

  const row = (key: CompanionSettingKey) => {
    const Icon = ICONS[key];
    return (
      <SettingsField key={key} inline label={t(`${key}.label`)} icon={Icon} hint={t(`${key}.hint`)}>
        <Switch checked={settings[key]} disabled={!canEdit || pending} onCheckedChange={(value) => toggle(key, value)} aria-label={t(`${key}.label`)} />
      </SettingsField>
    );
  };

  return (
    <div>
      <div className="mb-6 empty:hidden">
        <CompanionBanner serverId={serverId} section="server-settings" />
      </div>
      <SettingsGroup tone="blue" icon={Activity} title={t("feedTitle")} description={t("feedDescription")}>
        {FEED_SETTINGS.map(row)}
      </SettingsGroup>
      <SettingsGroup tone="green" icon={MapPin} title={t("playersTitle")} description={t("playersDescription")}>
        {row("coords")}
      </SettingsGroup>
      <MaintenanceGroup
        // Remounted after a save so the form starts from what was stored
        key={JSON.stringify(overview.maintenance)}
        serverId={serverId}
        current={overview.maintenance}
        offline={state !== "connected"}
      />
    </div>
  );
}
