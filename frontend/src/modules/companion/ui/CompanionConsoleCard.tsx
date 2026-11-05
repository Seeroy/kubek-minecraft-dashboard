"use client";

import { InfoCard } from "@/modules/console/ui/InfoCard";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Gauge, Lock } from "lucide-react";
import Link from "next/link";
import { useCompanion } from "../hooks/useCompanion";
import { fixed, tpsTone } from "../lib/health";
import { useCompanionHint } from "./CompanionLock";

/** TPS and tick time in the console rail, a locked card until the plugin talks */
export function CompanionConsoleCard({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.companion.console");
  const { state, live } = useCompanion(serverId);
  const hint = useCompanionHint(state);
  if (state === "loading" || state === "unsupported") return null;

  if (state !== "connected") {
    return (
      <Link href="/performance" className="block rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-primary/70" title={hint}>
        <InfoCard
          icon={Gauge}
          tone="gray"
          label={t("label")}
          value={<span className="text-muted-foreground">{t("locked")}</span>}
          action={<Lock className="size-4 text-muted-foreground" />}
          className="opacity-80 transition-opacity hover:opacity-100"
        />
      </Link>
    );
  }

  const tps = live?.stats?.tps?.[0];
  const mspt = live?.stats?.mspt?.avg;
  return (
    <Link href="/performance" className="block rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-primary/70 [&>div]:transition-colors [&>div]:hover:bg-hover">
      <InfoCard
        icon={Gauge}
        tone={tpsTone(tps)}
        label={t("label")}
        value={
          <span className="tabular-nums">
            <span className="text-tone">{fixed(tps, 2)}</span>
            {mspt != null && <span className="ml-2 text-xs font-medium text-muted-foreground">{t("mspt", fixed(mspt))}</span>}
          </span>
        }
      />
    </Link>
  );
}
