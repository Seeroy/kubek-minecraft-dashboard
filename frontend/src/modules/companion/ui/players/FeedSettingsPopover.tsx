"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/shared/ui/popover";
import { Switch } from "@/shared/ui/switch";
import { Settings2 } from "lucide-react";
import { FEED_SETTINGS, useCompanionSettings } from "../../hooks/useCompanionSettings";

/** What goes into the feed, right next to the feed itself */
export function FeedSettingsPopover({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.companion.settings");
  const { settings, canEdit, pending, toggle } = useCompanionSettings(serverId);
  if (!settings) return null;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" title={t("feedTitle")} aria-label={t("feedTitle")} />}>
        <Settings2 />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>{t("feedTitle")}</PopoverTitle>
          <PopoverDescription>{t("feedDescription")}</PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-3">
          {FEED_SETTINGS.map((key) => (
            <label key={key} className="flex items-start justify-between gap-3 text-[13px]">
              <span className="grid gap-0.5">
                <span className="font-medium">{t(`${key}.label`)}</span>
                <span className="text-xs text-muted-foreground">{t(`${key}.hint`)}</span>
              </span>
              <Switch checked={settings[key]} disabled={!canEdit || pending} onCheckedChange={(value) => toggle(key, value)} />
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
