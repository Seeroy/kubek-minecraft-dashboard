"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { useBotInfoQuery } from "@/modules/settings/api/telegram.queries";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { MainConfigFormData } from "../../validations/schema";

interface TelegramBotConfigProps {
  form: UseFormReturn<MainConfigFormData>;
}

/** Bot token input + live identity readout for the configured bot */
export function TelegramBotConfig({ form }: TelegramBotConfigProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const { t } = useTranslation("modules.settings");
  // Validation messages are full translation keys from the zod schema
  const { t: tError } = useTranslation();
  const token = watch("telegramBot.token");

  const botInfoQuery = useBotInfoQuery(!!token);
  const botInfo = botInfoQuery.isError
    ? { name: "", username: "", error: "Failed to fetch bot info" }
    : (botInfoQuery.data ?? null);
  const botInfoLoading = botInfoQuery.isLoading || botInfoQuery.isFetching;

  return (
    <>
      {/* Telegram Bot Token */}
      <div className="space-y-2">
        <Label htmlFor="telegram-token">{t("telegram.token.label")}</Label>
        <Input
          id="telegram-token"
          placeholder={t("telegram.token.placeholder")}
          aria-invalid={!!errors.telegramBot?.token}
          {...register("telegramBot.token")}
        />
        {errors.telegramBot?.token && (
          <p className="text-sm text-destructive">
            {errors.telegramBot.token.message &&
              tError(errors.telegramBot.token.message)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("telegram.token.help")}
        </p>
      </div>

      {/* Bot Info Display */}
      {token && (
        <div className="space-y-2">
          <Label>{t("telegram.botInfo.title")}</Label>
          <div className="rounded-lg border bg-muted/50 p-3">
            {botInfoLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {t("telegram.botInfo.validating")}
                </span>
              </div>
            ) : botInfo ? (
              <div className="space-y-2">
                {botInfo.error ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">{botInfo.error}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {t("telegram.botInfo.valid")}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>
                        Name:{" "}
                        <span className="font-medium">{botInfo.name}</span>
                      </div>
                      <div>
                        Username:{" "}
                        <span className="font-medium">@{botInfo.username}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
