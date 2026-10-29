"use client";

import type { SupportedLanguage } from "@/locales";
import { useNotificationSound } from "@/modules/notifications/utils/soundPreference";
import { useLanguageContext } from "@/shared/context/language-context";
import { useProfileQuery } from "@/shared/queries/auth.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { CopyButton } from "@/shared/ui/CopyButton";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { LanguageFlag } from "@/shared/ui/LanguageFlag";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Switch } from "@/shared/ui/switch";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Bell, CircleUser, FolderSync, Gamepad2, Gauge, Globe, Info, Languages, Monitor, Moon, Network, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import type { MainConfigFormData } from "../validations/schema";
import { FtpPasswordField } from "./ftp/FtpPasswordField";
import { SkinNameInput } from "./SkinNameInput";
import { ThemePicker } from "./ThemePicker";

const MODES = [
  { id: "system", icon: Monitor },
  { id: "dark", icon: Moon },
  { id: "light", icon: Sun },
] as const;

// Empty number inputs give NaN, which zod rejects as a type error instead of "required"
export const toOptionalNumber = (value: unknown) => {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export default function GeneralSettings({ form }: { form: UseFormReturn<MainConfigFormData> }) {
  const { t } = useTranslation("modules.settings.general");
  // Validation messages are full translation keys
  const { t: tRoot } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { language, availableLanguages, setLanguage } = useLanguageContext();
  const [soundEnabled, setSoundEnabled] = useNotificationSound();
  const { register, control, formState } = form;
  const { errors, dirtyFields } = formState;
  const [ftpEnabled, ftpPort] = useWatch({ control, name: ["ftpd.enabled", "ftpd.port"] });
  const username = useProfileQuery().data?.username;
  // The panel and FTP share a host, the address in the bar is what the user reaches
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const error = (message: string | undefined) => (message ? <FieldError>{tRoot(message)}</FieldError> : null);

  return (
    <>
      <SettingsGroup tone="green" icon={CircleUser} title={t("profile.title")} description={t("profile.description")}>
        <SettingsField label={t("profile.label")} icon={Gamepad2} hint={t("profile.hint")} changed={!!dirtyFields.skinName} htmlFor="profile-skin-name">
          <Controller
            control={control}
            name="skinName"
            render={({ field }) => <SkinNameInput id="profile-skin-name" value={field.value} onChange={field.onChange} />}
          />
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup tone="purple" icon={Palette} title={t("theme.title")} description={t("theme.description")}>
        <SettingsField label={t("theme.title")} icon={Palette} wide>
          <ThemePicker />
        </SettingsField>
        <SettingsField label={t("theme.mode")} icon={Moon}>
          <ToggleGroup
            variant="segmented"
            className="w-fit"
            value={[theme ?? "system"]}
            onValueChange={(next) => next[0] && setTheme(next[0])}
          >
            {MODES.map(({ id, icon: Icon }) => (
              <Toggle key={id} variant="segmented" value={id}>
                <Icon />
                {t(`theme.modes.${id}`)}
              </Toggle>
            ))}
          </ToggleGroup>
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup tone="blue" icon={Languages} title={t("language.title")} description={t("language.description")}>
        <SettingsField label={t("language.label")} icon={Globe}>
          <Select<SupportedLanguage> value={language} onValueChange={(value) => value && setLanguage(value)}>
            <SelectTrigger className="w-full" aria-label={t("language.label")}>
              <SelectValue>
                {(value: SupportedLanguage) => {
                  const current = availableLanguages.find((l) => l.code === value);
                  return current ? (
                    <>
                      <LanguageFlag code={current.code} />
                      {current.label}
                    </>
                  ) : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <LanguageFlag code={lang.code} />
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup tone="amber" icon={Bell} title={t("notifications.title")} description={t("notifications.description")}>
        <SettingsField label={t("notifications.sound")} icon={Bell} hint={t("notifications.soundHint")} inline>
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} aria-label={t("notifications.sound")} />
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup tone="cyan" icon={Network} title={t("panel.title")} description={t("panel.description")}>
        <SettingsField label={t("panel.port")} icon={Network} hint={t("panel.portHint")} changed={!!dirtyFields.port} htmlFor="panel-port">
          <Input
            id="panel-port"
            type="number"
            className="font-mono"
            placeholder="8080"
            aria-invalid={!!errors.port}
            {...register("port", { setValueAs: toOptionalNumber })}
          />
          {error(errors.port?.message)}
        </SettingsField>
        <SettingsField
          label={t("panel.serverStats")}
          icon={Gauge}
          changed={!!dirtyFields.serverStats?.enabled}
          hint={
            <>
              {t("panel.serverStatsHint")} <code className="font-mono text-[12px]">KUBEK_SERVER_STATS=off</code>
            </>
          }
          inline
        >
          <Controller
            control={control}
            name="serverStats.enabled"
            render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label={t("panel.serverStats")} />}
          />
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup tone="green" icon={FolderSync} title={t("ftp.title")} description={t("ftp.description")}>
        <SettingsField label={t("ftp.enable")} icon={FolderSync} hint={t("ftp.enableHint")} changed={!!dirtyFields.ftpd?.enabled} inline>
          <Controller
            control={control}
            name="ftpd.enabled"
            render={({ field }) => (
              <Switch
                checked={!!field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  // Turning FTP on makes the port required
                  void form.trigger("ftpd");
                }}
                aria-label={t("ftp.enable")}
              />
            )}
          />
        </SettingsField>

        <div className="col-span-full grid gap-5 transition-opacity aria-disabled:opacity-45 md:grid-cols-[1fr_140px]" aria-disabled={!ftpEnabled}>
          <FtpPasswordField enabled={!!ftpEnabled} />
          <SettingsField label={t("ftp.port")} icon={Network} changed={!!dirtyFields.ftpd?.port} htmlFor="ftp-port">
            <Input
              id="ftp-port"
              type="number"
              className="font-mono"
              placeholder="21"
              disabled={!ftpEnabled}
              aria-invalid={!!errors.ftpd?.port}
              {...register("ftpd.port", { setValueAs: toOptionalNumber })}
            />
            {error(errors.ftpd?.port?.message)}
          </SettingsField>
        </div>

        {ftpEnabled && (
          <SettingsField label={t("ftp.details")} icon={Info} hint={t("ftp.hint")} wide>
            <KeyValue className="rounded-md border border-dashed border-border bg-subtle px-4 py-3 [&_dd]:text-left [&_dd]:font-mono [&_dd]:text-[12.5px]">
              <KeyValueItem label={t("ftp.host")}>
                <span className="inline-flex items-center gap-1">
                  {host}
                  <CopyButton value={host} title={t("ftp.copyHost")} />
                </span>
              </KeyValueItem>
              <KeyValueItem label={t("ftp.port")}>{ftpPort || 21}</KeyValueItem>
              <KeyValueItem label={t("ftp.user")}>{username || "—"}</KeyValueItem>
            </KeyValue>
          </SettingsField>
        )}
      </SettingsGroup>
    </>
  );
}
