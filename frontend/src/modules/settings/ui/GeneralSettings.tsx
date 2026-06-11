"use client";

import { NOTIFICATION_SOUND_STORAGE_KEY } from "@/modules/notifications/utils/soundPreference";
import { ThemePicker } from "@/modules/settings/ui/ThemePicker";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { Switch } from "@/shared/ui/switch";
import { Bell, FolderSync, Languages, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { MainConfigFormData } from "../validations/schema";

interface GeneralSettingsProps {
  form: UseFormReturn<MainConfigFormData>;
}

export default function GeneralSettings({ form }: GeneralSettingsProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const watchFTPEnabled = watch("ftpd.enabled");
  const user = useAuthStore((s) => s.user);
  const { language, availableLanguages, setLanguage } = useLanguageContext();
  const { t } = useTranslation("modules.settings");
  // Validation messages are full translation keys from the zod schema
  const { t: tError } = useTranslation();
  const [notificationSoundEnabled, setNotificationSoundEnabled] =
    useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotificationSoundEnabled(
      window.localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY) !== "false"
    );
  }, []);

  const handleNotificationSoundChange = (value: boolean) => {
    setNotificationSoundEnabled(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        NOTIFICATION_SOUND_STORAGE_KEY,
        String(value)
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Color Themes */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("general.colorTheme.title")}
            title={t("general.colorTheme.title")}
            description={t("general.colorTheme.description")}
            icon={Settings}
            color="primary"
          />
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("general.language.title")}
            title={t("general.language.title")}
            description={t("general.language.description")}
            icon={Languages}
            color="blue"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Select
              value={language}
              onValueChange={(value) => value != null && setLanguage(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("general.language.placeholder")}>
                  {(value: string) => {
                    const lang = availableLanguages.find(
                      (l) => l.code === value
                    );
                    if (!lang) return t("general.language.placeholder");
                    return (
                      <>
                        <span className={`fi fi-${lang.code}`} />
                        {lang.label}
                      </>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className={`fi fi-${lang.code}`} />
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications (per-browser preference) */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("general.notifications.title")}
            title={t("general.notifications.title")}
            description={t("general.notifications.description")}
            icon={Bell}
            color="yellow"
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="space-y-1">
              <Label
                className="text-sm font-medium"
                htmlFor="notification-sound-enabled"
              >
                {t("general.notifications.sound.label")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("general.notifications.sound.description")}
              </p>
            </div>
            <Switch
              id="notification-sound-enabled"
              checked={notificationSoundEnabled}
              onCheckedChange={handleNotificationSoundChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Panel Configuration */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("general.panelConfiguration.title")}
            title={t("general.panelConfiguration.title")}
            description={t("general.panelConfiguration.description")}
            icon={Settings}
            color="purple"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="port">
              {t("general.panelConfiguration.port.label")}
            </Label>
            <Input
              id="port"
              type="number"
              placeholder="8080"
              {...register("port", { valueAsNumber: true })}
            />
            {errors.port && (
              <p className="text-sm text-destructive">
                {errors.port.message && tError(errors.port.message)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("general.panelConfiguration.port.description")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FTP Configuration */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("general.ftp.title")}
            title={t("general.ftp.title")}
            description={t("general.ftp.description")}
            icon={FolderSync}
            color="green"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium" htmlFor="ftpd-enabled">
                {t("general.ftp.enable.label")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("general.ftp.enable.description")}
              </p>
            </div>
            <Switch
              id="ftpd-enabled"
              checked={watchFTPEnabled}
              onCheckedChange={(value) => setValue("ftpd.enabled", value)}
            />
          </div>

          {watchFTPEnabled && (
            <div className="animate-in space-y-6 duration-200 fade-in slide-in-from-top-2">
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                {/* FTP Username */}
                <div className="space-y-2">
                  <Label htmlFor="ftpd-username">
                    {t("general.ftp.username")}
                  </Label>
                  <Input
                    id="ftpd-username"
                    placeholder="admin"
                    {...register("ftpd.username")}
                  />
                  {errors.ftpd?.username && (
                    <p className="text-sm text-destructive">
                      {errors.ftpd.username.message &&
                        tError(errors.ftpd.username.message)}
                    </p>
                  )}
                </div>

                {/* FTP Password */}
                <div className="space-y-2">
                  <Label htmlFor="ftpd-password">
                    {t("general.ftp.password")}
                  </Label>
                  <Input
                    id="ftpd-password"
                    type="password"
                    placeholder={t("general.ftp.passwordPlaceholder")}
                    {...register("ftpd.password")}
                  />
                  {errors.ftpd?.password && (
                    <p className="text-sm text-destructive">
                      {errors.ftpd.password.message &&
                        tError(errors.ftpd.password.message)}
                    </p>
                  )}
                </div>

                {/* FTP Port */}
                <div className="space-y-2">
                  <Label htmlFor="ftpd-port">{t("general.ftp.port")}</Label>
                  <Input
                    id="ftpd-port"
                    type="number"
                    placeholder="21"
                    {...register("ftpd.port", { valueAsNumber: true })}
                  />
                  {errors.ftpd?.port && (
                    <p className="text-sm text-destructive">
                      {errors.ftpd.port.message &&
                        tError(errors.ftpd.port.message)}
                    </p>
                  )}
                </div>
              </div>

              {/* FTP Root Error */}
              {errors.ftpd?.root && (
                <div className="text-sm font-medium text-destructive">
                  {errors.ftpd.root.message &&
                    tError(errors.ftpd.root.message)}
                </div>
              )}

              <Separator />

              {/* FTP Connection Details */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">
                    {t("general.ftp.connectionDetails.title")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("general.ftp.connectionDetails.description")}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <div className="rounded-lg border border-border/40 bg-muted/60 px-3 py-2 font-mono text-sm">
                      localhost
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Port</Label>
                    <div className="rounded-lg border border-border/40 bg-muted/60 px-3 py-2 font-mono text-sm">
                      {watch("ftpd.port") || 21}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="rounded-lg border border-border/40 bg-muted/60 px-3 py-2 font-mono text-sm">
                      {user?.username || "Not logged in"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="rounded-lg border border-border/40 bg-muted/60 px-3 py-2 font-mono text-sm">
                      {t("general.ftp.connectionDetails.password")}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[oklch(0.70_0.15_200/0.25)] bg-[oklch(0.70_0.15_200/0.10)] p-3.5">
                  <p className="text-sm text-[oklch(0.40_0.13_200)] dark:text-[oklch(0.80_0.15_200)]">
                    {t("general.ftp.connectionDetails.instructions")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
