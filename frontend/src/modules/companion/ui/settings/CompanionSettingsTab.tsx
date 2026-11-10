"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { DataReveal } from "@/shared/ui/data-reveal";
import { LoadError } from "@/shared/ui/load-error";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Switch } from "@/shared/ui/switch";
import { Activity, DoorOpen, MapPin, MessageSquare, Skull, UserX, type LucideIcon } from "lucide-react";
import { useCompanion } from "../../hooks/useCompanion";
import { FEED_SETTINGS, useCompanionSettings, type CompanionSettingKey } from "../../hooks/useCompanionSettings";
import { SAMPLE_COMPANION_SETTINGS } from "../../data/samples";
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
  const { state, overview, failed, retry, retrying } = useCompanion(serverId);
  const { settings, canEdit, pending, toggle } = useCompanionSettings(serverId);

  return (
    <DataReveal
      id="server-settings-companion"
      data={overview && settings ? { settings, maintenance: overview.maintenance } : undefined}
      sample={SAMPLE_COMPANION_SETTINGS}
      error={failed && <LoadError onRetry={retry} retrying={retrying} />}
    >
      {(data) => {
        const row = (key: CompanionSettingKey) => {
          const Icon = ICONS[key];
          return (
            <SettingsField key={key} inline label={t(`${key}.label`)} icon={Icon} hint={t(`${key}.hint`)}>
              <Switch checked={data.settings[key]} disabled={!canEdit || pending} onCheckedChange={(value) => toggle(key, value)} aria-label={t(`${key}.label`)} />
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
              key={JSON.stringify(data.maintenance)}
              serverId={serverId}
              current={data.maintenance}
              offline={state !== "connected"}
            />
          </div>
        );
      }}
    </DataReveal>
  );
}
