"use client";

import type { TwoFactorMethod } from "@/api";
import { useProfileQuery } from "@/shared/queries/auth.queries";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { NotificationPrefsButton } from "@/modules/inbox";
import { Bell, CalendarClock, Lock, Pin, Plus, Send, Shield } from "lucide-react";
import { useState } from "react";
import { useLinkedUsersQuery } from "../api/telegram.queries";
import {
  useDisableTelegramMutation,
  useEnableTelegramMutation,
  usePreferencesQuery,
  useSetupTotpMutation,
  useTwofaStatusQuery,
  useUpdatePreferencesMutation,
} from "../api/twofa.queries";
import { DisableTotpDialog, TotpSetupDialog, type TotpSetup } from "./twofa/TotpDialogs";

function MethodLabel({ title, enabled }: { title: string; enabled: boolean }) {
  const { t } = useTranslation("modules.settings.twofa");
  return (
    <span className="flex items-center gap-2">
      {title}
      <Badge variant={enabled ? "success" : "secondary"}>{enabled ? t("enabled") : t("disabled")}</Badge>
    </span>
  );
}

export default function TwoFactorTab() {
  const { t } = useTranslation("modules.settings.twofa");
  const { notify } = useNotifications();
  const status = useTwofaStatusQuery();
  const preferences = usePreferencesQuery();
  const linked = useLinkedUsersQuery(true);
  const profile = useProfileQuery();
  const setupTotp = useSetupTotpMutation();
  const enableTelegram = useEnableTelegramMutation();
  const disableTelegram = useDisableTelegramMutation();
  const updatePreferences = useUpdatePreferencesMutation();
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [disabling, setDisabling] = useState(false);

  const totp = status.data?.totpEnabled ?? false;
  const telegram = status.data?.telegramEnabled ?? false;
  const primary = status.data?.primary ?? null;
  const me = profile.data;
  // Telegram confirmation needs an active link between this account and a Telegram user
  const telegramReady = !!me && (linked.data ?? []).some((link) => link.telegramUser?.userId === me.id && link.telegramUser?.isActive);

  const toggleTelegram = (next: boolean) =>
    (next ? enableTelegram : disableTelegram).mutate(undefined, {
      onSuccess: () => notify({ type: "success", title: t(next ? "toasts.telegramEnabled" : "toasts.telegramDisabled") }),
    });

  if (status.isLoading || preferences.isLoading) return <Skeleton className="h-80 rounded-lg" />;

  return (
    <>
      <SettingsGroup tone="purple" icon={Lock} title={t("title")} description={t("description")}>
        <SettingsField label={<MethodLabel title={t("totp.title")} enabled={totp} />} icon={Shield} hint={t("totp.description")} inline>
          {totp ? (
            <Button variant="destructive" onClick={() => setDisabling(true)}>
              {t("totp.disable")}
            </Button>
          ) : (
            <Button disabled={setupTotp.isPending} onClick={() => setupTotp.mutate(undefined, { onSuccess: setSetup })}>
              {setupTotp.isPending ? <Spinner /> : <Plus />}
              {t("totp.connect")}
            </Button>
          )}
        </SettingsField>

        <SettingsField
          label={<MethodLabel title={t("telegram.title")} enabled={telegram} />}
          icon={Send}
          hint={telegramReady ? t("telegram.available") : t("telegram.unavailable")}
          inline
        >
          <Switch
            checked={telegram}
            disabled={!telegramReady || enableTelegram.isPending || disableTelegram.isPending}
            onCheckedChange={toggleTelegram}
            aria-label={t("telegram.title")}
          />
        </SettingsField>

        <div className="col-span-full transition-opacity aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={!(totp && telegram)}>
          <SettingsField label={t("primary.label")} icon={Pin} hint={t("primary.hint")}>
            <ToggleGroup
              variant="segmented"
              className="w-fit"
              disabled={!(totp && telegram)}
              value={primary ? [primary] : []}
              onValueChange={(next) => next[0] && updatePreferences.mutate({ twofaPrimary: next[0] as TwoFactorMethod })}
            >
              <Toggle variant="segmented" value="totp">
                TOTP
              </Toggle>
              <Toggle variant="segmented" value="telegram">
                Telegram
              </Toggle>
            </ToggleGroup>
          </SettingsField>
        </div>
      </SettingsGroup>

      <SettingsGroup tone="amber" icon={Bell} title={t("notifications.title")} description={t("notifications.description")}>
        <SettingsField label={t("notifications.toggle")} icon={CalendarClock} hint={t("notifications.hint")} inline>
          <NotificationPrefsButton>{t("notifications.open")}</NotificationPrefsButton>
        </SettingsField>
      </SettingsGroup>

      {setup && <TotpSetupDialog setup={setup} onClose={() => setSetup(null)} />}
      {disabling && <DisableTotpDialog onClose={() => setDisabling(false)} />}
    </>
  );
}
