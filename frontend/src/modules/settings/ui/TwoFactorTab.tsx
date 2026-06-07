"use client";

import type { TwoFactorMethod } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useProfileQuery } from "@/modules/auth/api/auth.queries";
import { useLinkedUsersQuery } from "@/modules/settings/api/telegram.queries";
import {
  useConfirmTotpMutation,
  useDisableTelegramMutation,
  useDisableTotpMutation,
  useEnableTelegramMutation,
  usePreferencesQuery,
  useSetupTotpMutation,
  useTwofaStatusQuery,
  useUpdatePreferencesMutation,
} from "@/modules/settings/api/twofa.queries";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Bell, KeyRound, Loader2, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";

type SetupState = {
  setupToken: string;
  secret: string;
  qrDataUrl: string;
} | null;

export default function TwoFactorTab() {
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.settings.twoFactorTab");

  const statusQuery = useTwofaStatusQuery();
  const prefsQuery = usePreferencesQuery();
  const linkedUsersQuery = useLinkedUsersQuery(true);
  const profileQuery = useProfileQuery();

  const totpEnabled = statusQuery.data?.totpEnabled ?? false;
  const telegramEnabled = statusQuery.data?.telegramEnabled ?? false;
  const primary = statusQuery.data?.primary ?? null;
  const notifyTaskResults = prefsQuery.data?.notifyTaskResults ?? false;

  const linked = linkedUsersQuery.data ?? [];
  const me = profileQuery.data;
  const telegramAvailable =
    !!me &&
    linked.some(
      (l) => l.telegramUser?.userId === me.id && l.telegramUser?.isActive
    );

  const loading = statusQuery.isLoading || prefsQuery.isLoading;

  const [setupState, setSetupState] = useState<SetupState>(null);
  const [setupCode, setSetupCode] = useState("");
  const [setupError, setSetupError] = useState("");

  const [disablePassword, setDisablePassword] = useState("");
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableError, setDisableError] = useState("");

  const setupMutation = useSetupTotpMutation();
  const confirmMutation = useConfirmTotpMutation();
  const disableMutation = useDisableTotpMutation();
  const enableTelegramMutation = useEnableTelegramMutation();
  const disableTelegramMutation = useDisableTelegramMutation();
  const updatePreferencesMutation = useUpdatePreferencesMutation();

  const setupBusy = setupMutation.isPending || confirmMutation.isPending;
  const disableBusy = disableMutation.isPending;
  const busyTelegram =
    enableTelegramMutation.isPending || disableTelegramMutation.isPending;

  ///
  /// TOTP setup
  ///
  const beginTotp = () => {
    setSetupError("");
    setupMutation.mutate(undefined, {
      onSuccess: (res) => {
        setSetupState({
          setupToken: res.setupToken,
          secret: res.secret,
          qrDataUrl: res.qrDataUrl,
        });
        setSetupCode("");
      },
      onError: (err: unknown) => {
        notify({
          title:
            (err instanceof Error ? err.message : "") ||
            t("toasts.setupFailed"),
          type: "error",
        });
      },
    });
  };

  const confirmTotp = () => {
    if (!setupState) return;
    setSetupError("");
    confirmMutation.mutate(
      { setupToken: setupState.setupToken, code: setupCode },
      {
        onSuccess: () => {
          notify({ title: t("toasts.totpEnabled"), type: "success" });
          setSetupState(null);
          setSetupCode("");
        },
        onError: (err: unknown) => {
          setSetupError(
            (err instanceof Error ? err.message : "") || t("toasts.invalidCode")
          );
          setSetupCode("");
        },
      }
    );
  };

  const disableTotp = () => {
    setDisableError("");
    disableMutation.mutate(disablePassword, {
      onSuccess: () => {
        notify({ title: t("toasts.totpDisabled"), type: "success" });
        setDisableOpen(false);
        setDisablePassword("");
      },
      onError: (err: unknown) => {
        setDisableError(
          (err instanceof Error ? err.message : "") ||
            t("toasts.invalidPassword")
        );
      },
    });
  };

  ///
  /// Telegram 2FA
  ///
  const toggleTelegram = (next: boolean) => {
    const mutation = next ? enableTelegramMutation : disableTelegramMutation;
    mutation.mutate(undefined, {
      onSuccess: () => {
        notify({
          title: next
            ? t("toasts.telegramEnabled")
            : t("toasts.telegramDisabled"),
          type: "success",
        });
      },
      onError: (err: unknown) => {
        notify({
          title:
            (err instanceof Error ? err.message : "") ||
            t("toasts.toggleFailed"),
          type: "error",
        });
      },
    });
  };

  const setPrimaryMethod = (method: TwoFactorMethod) => {
    updatePreferencesMutation.mutate(
      { twofaPrimary: method },
      {
        onError: (err: unknown) => {
          notify({
            title:
              (err instanceof Error ? err.message : "") ||
              t("toasts.saveFailed"),
            type: "error",
          });
        },
      }
    );
  };

  const toggleNotifyTasks = (next: boolean) => {
    updatePreferencesMutation.mutate(
      { notifyTaskResults: next },
      {
        onError: (err: unknown) => {
          notify({
            title:
              (err instanceof Error ? err.message : "") ||
              t("toasts.saveFailed"),
            type: "error",
          });
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("header.kicker")}
            title={t("header.title")}
            description={t("header.description")}
            icon={ShieldCheck}
            color="green"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TOTP card */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span className="font-medium">{t("totp.title")}</span>
                  {totpEnabled ? (
                    <span className="text-xs text-green-600">
                      {t("totp.enabled")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("totp.disabled")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("totp.description")}
                </p>
              </div>
              {totpEnabled ? (
                <Button variant="outline" onClick={() => setDisableOpen(true)}>
                  {t("totp.disable")}
                </Button>
              ) : (
                <Button onClick={beginTotp} disabled={setupBusy}>
                  {setupBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("totp.connect")
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Telegram card */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <span className="font-medium">{t("telegram.title")}</span>
                  {telegramEnabled ? (
                    <span className="text-xs text-green-600">
                      {t("telegram.enabled")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("telegram.disabled")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {telegramAvailable
                    ? t("telegram.available")
                    : t("telegram.unavailable")}
                </p>
              </div>
              <Switch
                checked={telegramEnabled}
                disabled={!telegramAvailable || busyTelegram}
                onCheckedChange={toggleTelegram}
              />
            </div>
          </div>

          {/* Primary method selector */}
          {totpEnabled && telegramEnabled ? (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4">
              <Label className="text-sm font-medium">
                {t("primary.label")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("primary.hint")}
              </p>
              <div className="flex gap-2">
                <Button
                  variant={primary === "totp" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPrimaryMethod("totp")}
                >
                  TOTP
                </Button>
                <Button
                  variant={primary === "telegram" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPrimaryMethod("telegram")}
                >
                  Telegram
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("notifications.kicker")}
            title={t("notifications.title")}
            description={t("notifications.description")}
            icon={Bell}
            color="blue"
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="space-y-1">
              <Label className="text-base">
                {t("notifications.toggleLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {telegramAvailable
                  ? t("notifications.available")
                  : t("notifications.unavailable")}
              </p>
            </div>
            <Switch
              checked={notifyTaskResults}
              disabled={!telegramAvailable}
              onCheckedChange={toggleNotifyTasks}
            />
          </div>
        </CardContent>
      </Card>

      {/* TOTP setup dialog */}
      <Dialog
        open={!!setupState}
        onOpenChange={(o) => {
          if (!o) {
            setSetupState(null);
            setSetupError("");
            setSetupCode("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("setupDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("setupDialog.description")}
            </DialogDescription>
          </DialogHeader>
          {setupState ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setupState.qrDataUrl}
                  alt="QR"
                  className="h-48 w-48 rounded bg-white p-2"
                />
              </div>
              <Alert>
                <AlertDescription>
                  {t("setupDialog.manualHint")}
                  <code className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">
                    {setupState.secret}
                  </code>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="setup-code">{t("setupDialog.codeLabel")}</Label>
                <Input
                  id="setup-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={setupCode}
                  onChange={(e) => {
                    setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setSetupError("");
                  }}
                  className="text-center font-mono tracking-widest"
                />
              </div>
              {setupError ? (
                <Alert variant="destructive">
                  <AlertDescription>{setupError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupState(null)}>
              {t("setupDialog.cancel")}
            </Button>
            <Button
              onClick={confirmTotp}
              disabled={setupBusy || setupCode.length !== 6}
            >
              {setupBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("setupDialog.confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable confirmation dialog */}
      <Dialog
        open={disableOpen}
        onOpenChange={(o) => {
          setDisableOpen(o);
          if (!o) {
            setDisableError("");
            setDisablePassword("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("disableDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("disableDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-pass">
              {t("disableDialog.passwordLabel")}
            </Label>
            <Input
              id="disable-pass"
              type="password"
              value={disablePassword}
              onChange={(e) => {
                setDisablePassword(e.target.value);
                setDisableError("");
              }}
            />
            {disableError ? (
              <Alert variant="destructive">
                <AlertDescription>{disableError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              {t("disableDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={disableTotp}
              disabled={disableBusy || !disablePassword}
            >
              {disableBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("disableDialog.disable")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
