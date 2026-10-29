"use client";
import type { Server } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Switch } from "@/shared/ui/switch";
import { Shuffle } from "lucide-react";
import type { SettingsDraft } from "../hooks/useSettingsDraft";
import { PROPERTY_GROUPS, type PropertyField, type SettingsTab } from "../lib/schema";
import { MotdPreview } from "./MotdPreview";

const randomSeed = () => String(Math.floor(Math.random() * 2 ** 53) * (Math.random() < 0.5 ? -1 : 1));

function PropertyControl({ field, draft, server }: { field: PropertyField; draft: SettingsDraft; server: Server }) {
  const { t } = useTranslation("modules.serverSettings");
  const value = draft.property(field.key);
  const id = `prop-${field.key}`;
  const common = { label: t(field.label), icon: field.icon, changed: draft.propertyChanged(field.key), htmlFor: id };

  switch (field.kind) {
    case "switch": {
      const checked = value === "true";
      return (
        <SettingsField
          {...common}
          inline
          hint={field.hint && t(field.hint)}
          warning={field.offWarning && !checked && draft.propertyChanged(field.key) ? t(field.offWarning) : undefined}
        >
          <Switch id={id} checked={checked} onCheckedChange={(next) => draft.setProperty(field.key, String(next))} />
        </SettingsField>
      );
    }
    case "select":
      return (
        <SettingsField {...common}>
          <Select value={value} onValueChange={(next) => next && draft.setProperty(field.key, String(next))}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue>
                {(selected) => {
                  const option = field.options.find((o) => o.value === selected);
                  return option ? t(option.label) : String(selected ?? "");
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
      );
    case "motd":
      return (
        <SettingsField {...common} wide>
          <Input id={id} value={value} placeholder={field.placeholder && t(field.placeholder)} onChange={(e) => draft.setProperty(field.key, e.target.value)} />
          <MotdPreview serverId={server.id} name={draft.values.name} motd={value} maxPlayers={draft.property("max-players")} />
        </SettingsField>
      );
    case "seed":
      return (
        <SettingsField {...common} wide>
          <div className="flex gap-2">
            <Input
              id={id}
              className="font-mono"
              value={value}
              placeholder={field.placeholder && t(field.placeholder)}
              onChange={(e) => draft.setProperty(field.key, e.target.value)}
            />
            <Button variant="outline" size="icon" onClick={() => draft.setProperty(field.key, randomSeed())} aria-label={t("world.worldGeneration.randomSeed")} title={t("world.worldGeneration.randomSeed")}>
              <Shuffle />
            </Button>
          </div>
        </SettingsField>
      );
    default:
      return (
        <SettingsField {...common} hint={field.hint && t(field.hint)} wide={field.wide}>
          <Input
            id={id}
            type={field.kind}
            inputMode={field.kind === "number" ? "numeric" : undefined}
            value={value}
            placeholder={field.placeholder && t(field.placeholder)}
            onChange={(e) => draft.setProperty(field.key, e.target.value)}
          />
        </SettingsField>
      );
  }
}

export function PropertyGroups({ tab, draft, server }: { tab: SettingsTab; draft: SettingsDraft; server: Server }) {
  const { t } = useTranslation("modules.serverSettings");
  return (
    <>
      {PROPERTY_GROUPS.filter((group) => group.tab === tab).map((group) => (
        <SettingsGroup
          key={group.id}
          tone={group.tone}
          icon={group.icon}
          title={t(group.title)}
          description={t(group.description)}
          note={group.note && t(group.note)}
        >
          {group.fields.map((field) => (
            <PropertyControl key={field.key} field={field} draft={draft} server={server} />
          ))}
        </SettingsGroup>
      ))}
    </>
  );
}
