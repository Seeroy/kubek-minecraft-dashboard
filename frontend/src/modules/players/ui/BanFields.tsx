"use client";
import type { BanEntry, IpBanEntry } from "@/api";
import { useNow } from "@/shared/hooks/useNow";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { formatDate } from "../lib/players";

interface BanFieldsProps {
  reason: string;
  onReason: (reason: string) => void;
  disabled?: boolean;
}

export function BanFields({ reason, onReason, disabled }: BanFieldsProps) {
  const { t } = useTranslation("modules.players.bans");
  return (
    <Input
      value={reason}
      onChange={(event) => onReason(event.target.value)}
      placeholder={t("reasonPlaceholder")}
      aria-label={t("reason")}
      maxLength={256}
      disabled={disabled}
      className="w-full sm:w-56"
    />
  );
}

export function BanExpiry({ ban }: { ban: BanEntry | IpBanEntry }) {
  const { t } = useTranslation("modules.players.bans");
  const now = useNow();
  if (ban.expiresAt === null) return <Badge variant="destructive">{t("permanent")}</Badge>;
  if (now && ban.expiresAt <= now) return <Badge variant="secondary">{t("expired")}</Badge>;
  return <Badge variant="warning">{t("until", formatDate(ban.expiresAt))}</Badge>;
}

export function BanDetail({ ban }: { ban: BanEntry | IpBanEntry }) {
  const { t } = useTranslation("modules.players.bans");
  const by = ban.source && ban.createdAt ? t("by", ban.source, formatDate(ban.createdAt)) : ban.source;
  return (
    <>
      {ban.reason && <span className="text-foreground/80">{ban.reason}</span>}
      {ban.reason && by && " · "}
      {by}
    </>
  );
}
