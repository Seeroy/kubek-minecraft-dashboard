"use client";

import { useSocketApi } from "@/shared/context/socket-context";
import { useNow } from "@/shared/hooks/useNow";
import { useStreamerMask } from "@/shared/hooks/useStreamerMode";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Meter } from "@/shared/ui/meter";
import { Private } from "@/shared/ui/private";
import { Spinner } from "@/shared/ui/spinner";
import { WsTelegramEventTypes } from "@shared/types/ws/server-events.types";
import { Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useGenerateOtpMutation } from "../../api/telegram.queries";
import { PasswordDialog } from "../twofa/PasswordDialog";

interface Otp {
  code: string;
  issuedAt: number;
  expiresAt: number;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** One-time code the user sends to the bot, it arrives over the socket with its expiry */
export function OtpLinking({ botUsername }: { botUsername?: string }) {
  const { t } = useTranslation("modules.settings.telegram.linking");
  const { t: tTwofa } = useTranslation("modules.settings.twofa");
  const { subscribe, unsubscribe } = useSocketApi();
  const generate = useGenerateOtpMutation();
  const [otp, setOtp] = useState<Otp | null>(null);
  const [asking, setAsking] = useState(false);
  const now = useNow();
  const mask = useStreamerMask("secret");

  useEffect(() => {
    // Countdown pings carry no code, the expiry is enough to count down locally
    const onUpdate = (data: { code?: string; expiresAt?: number }) => {
      if (data.code && data.expiresAt) setOtp({ code: data.code, issuedAt: Date.now(), expiresAt: data.expiresAt });
    };
    subscribe(WsTelegramEventTypes.OTP_UPDATE, onUpdate);
    return () => unsubscribe(WsTelegramEventTypes.OTP_UPDATE, onUpdate);
  }, [subscribe, unsubscribe]);

  const left = otp ? Math.max(0, Math.ceil((otp.expiresAt - now) / 1000)) : 0;
  const total = otp ? Math.max(1, (otp.expiresAt - otp.issuedAt) / 1000) : 1;

  return (
    <div className="col-span-full grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      {otp && left > 0 ? (
        <div className="tone-cyan grid gap-2">
          <div className="rounded-md bg-tone/10 px-4 py-3 text-center font-mono text-[26px] font-semibold tracking-[0.3em] text-tone">
            <Private level="secret">{otp.code}</Private>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            {t("expiresIn")} <b className="font-semibold text-foreground tabular-nums">{clock(left)}</b> ·{" "}
            {botUsername ? t("sendTo", mask.value(`@${botUsername}`)) : t("sendToBot")}
          </p>
          <Meter value={(left / total) * 100} tone="cyan" aria-label={`${t("expiresIn")} ${clock(left)}`} />
        </div>
      ) : (
        <p className="text-[12.5px] text-muted-foreground">{otp ? t("expired") : t("idle")}</p>
      )}
      <Button onClick={() => setAsking(true)} disabled={generate.isPending}>
        {generate.isPending ? <Spinner /> : <Zap />}
        {t("generate")}
      </Button>
      {asking && <PasswordDialog title={tTwofa("passwordDialog.otp")} onConfirm={generate.mutateAsync} onClose={() => setAsking(false)} />}
    </div>
  );
}
