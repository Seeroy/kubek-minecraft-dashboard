"use client";

import { setStreamerLevel, useStreamerLevel } from "@/shared/hooks/useStreamerMode";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { STREAMER_LEVELS, toStreamerLevel } from "@/shared/lib/streamer-mode";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { EyeOff } from "lucide-react";

export function StreamerModeSettings() {
  const { t } = useTranslation("modules.settings.general.streamer");
  const level = useStreamerLevel();

  return (
    <SettingsGroup tone="pink" icon={EyeOff} title={t("title")} description={t("description")}>
      <SettingsField label={t("label")} icon={EyeOff} hint={t(`hints.${level}`)} wide>
        <ToggleGroup
          variant="segmented"
          className="w-fit"
          aria-label={t("label")}
          value={[level]}
          onValueChange={(next) => next[0] && setStreamerLevel(toStreamerLevel(next[0]))}
        >
          {STREAMER_LEVELS.map((id) => (
            <Toggle key={id} variant="segmented" value={id}>
              {t(`levels.${id}`)}
            </Toggle>
          ))}
        </ToggleGroup>
      </SettingsField>
    </SettingsGroup>
  );
}
