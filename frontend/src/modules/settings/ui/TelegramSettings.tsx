"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Bot } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { MainConfigFormData } from "../validations/schema";
import { TelegramBotConfig } from "./telegram/TelegramBotConfig";
import { TelegramLinkedUsers } from "./telegram/TelegramLinkedUsers";
import { TelegramOtpSection } from "./telegram/TelegramOtpSection";

interface TelegramSettingsProps {
  form: UseFormReturn<MainConfigFormData>;
}

export default function TelegramSettings({ form }: TelegramSettingsProps) {
  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;
  const { t } = useTranslation("modules.settings");
  // Validation messages are full translation keys from the zod schema
  const { t: tError } = useTranslation();
  const watchTelegramEnabled = watch("telegramBot.enabled");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("telegram.title")}
            title={t("telegram.title")}
            description={t("telegram.description")}
            icon={Bot}
            color="blue"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Telegram Bot */}
          <div className="flex flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label className="text-base" htmlFor="telegram-enabled">
                {t("telegram.enable.label")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("telegram.enable.description")}
              </p>
            </div>
            <Switch
              id="telegram-enabled"
              checked={watchTelegramEnabled}
              onCheckedChange={(value) => {
                setValue("telegramBot.enabled", value, { shouldDirty: true });
                void trigger();
              }}
            />
          </div>

          {watchTelegramEnabled && (
            <>
              <TelegramBotConfig form={form} />
              <TelegramOtpSection />
              <TelegramLinkedUsers />

              {/* Telegram Root Error */}
              {errors.telegramBot?.root && (
                <div className="text-sm font-medium text-destructive">
                  {errors.telegramBot.root.message &&
                    tError(errors.telegramBot.root.message)}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
