"use client";

import { useSocketApi } from "@/shared/context/socket-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useGenerateOtpMutation } from "@/modules/settings/api/telegram.queries";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { WsTelegramEventTypes } from "@shared/types/ws/server-events.types";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface OtpState {
  code: string;
  expiresAt: number;
  countdown?: number;
}

/** Generates a one-time code and live-updates its countdown over the socket */
export function TelegramOtpSection() {
  const { t } = useTranslation("modules.settings");
  const { subscribe, unsubscribe } = useSocketApi();
  const otpMutation = useGenerateOtpMutation();
  const [currentOtp, setCurrentOtp] = useState<OtpState | null>(null);

  useEffect(() => {
    const handleOtpUpdate = (data: OtpState) => {
      if (data.code) {
        // New OTP generated
        setCurrentOtp({ code: data.code, expiresAt: data.expiresAt });
      } else if (data.countdown !== undefined) {
        // Countdown update
        setCurrentOtp((prev) =>
          prev ? { ...prev, countdown: data.countdown } : null
        );
      }
    };

    subscribe(WsTelegramEventTypes.OTP_UPDATE, handleOtpUpdate);

    return () => {
      unsubscribe(WsTelegramEventTypes.OTP_UPDATE, handleOtpUpdate);
    };
  }, [subscribe, unsubscribe]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{t("telegram.linking.title")}</Label>
        <Button
          onClick={() => otpMutation.mutate()}
          disabled={otpMutation.isPending}
          className="gap-2"
        >
          {otpMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("telegram.linking.generateOtp")}
        </Button>
      </div>

      {currentOtp && currentOtp.code && (
        <div className="rounded-xl border border-[oklch(0.70_0.15_200/0.25)] bg-[oklch(0.70_0.15_200/0.10)] p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t("telegram.linking.otp.code")}
              </span>
              <code className="rounded-md border border-[oklch(0.70_0.15_200/0.30)] bg-[oklch(0.70_0.15_200/0.20)] px-3 py-1 font-mono text-lg tracking-wider">
                {currentOtp.code}
              </code>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("telegram.linking.otp.expiresIn")}</span>
              <span
                className={`font-medium ${currentOtp.countdown && currentOtp.countdown <= 10 ? "text-red-600" : ""}`}
              >
                {currentOtp.countdown ||
                  Math.max(
                    0,
                    Math.ceil((currentOtp.expiresAt - Date.now()) / 1000)
                  )}{" "}
                {t("telegram.linking.otp.unit")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("telegram.linking.otp.help")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
