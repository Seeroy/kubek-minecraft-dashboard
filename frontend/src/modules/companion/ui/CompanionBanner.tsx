"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import LogoMark from "@/shared/ui/logo-mark";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Download, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { useCompanion, type CompanionState } from "../hooks/useCompanion";
import { useCompanionInstall } from "../hooks/useCompanionInstall";

// Only these two states ask the user to do something
type BannerState = Extract<CompanionState, "missing" | "waiting">;

const storageKey = (section: string, state: BannerState) => `kubek:companion-banner:${section}:${state}`;

const readDismissed = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

interface CompanionBannerProps {
  serverId: string;
  /** Dismissals are remembered per page */
  section: string;
}

/** Offer to install the plugin, or a reminder to restart after installing it */
export function CompanionBanner({ serverId, section }: CompanionBannerProps) {
  const { state, overview } = useCompanion(serverId);
  if (state !== "missing" && state !== "waiting") return null;
  return <Banner key={state} serverId={serverId} section={section} state={state} repoUrl={overview?.repoUrl} released={!!overview?.latest} />;
}

// released is false while GitHub has no release or can't be reached, installing would just fail
function Banner({ serverId, section, state, repoUrl, released }: CompanionBannerProps & { state: BannerState; repoUrl?: string; released: boolean }) {
  const { t } = useTranslation("modules.companion.banner");
  const { install, pending, allowed } = useCompanionInstall(serverId);
  const key = storageKey(section, state);
  const [dismissed, setDismissed] = useState(() => readDismissed(key));

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Hiding it for this visit is enough then
    }
  };

  return (
    <div className="tone-primary flex flex-wrap items-center gap-3 rounded-lg border border-tone/25 bg-tone/9 px-3 py-2.5 text-[13px] max-sm:items-start">
      <Plate tone="primary" size="sm">
        <LogoMark size={14} />
      </Plate>
      <div className="min-w-0 flex-1 basis-60">
        <b className="font-semibold">{t(`${state}.title`)}</b>
        <span className="text-muted-foreground"> {t(`${state}.text`)}</span>
      </div>
      <div className="flex items-center gap-1">
        {state === "missing" && allowed && released && (
          <Button size="sm" disabled={pending} onClick={() => void install()}>
            {pending ? <Spinner /> : <Download />}
            {pending ? t("installing") : t("install")}
          </Button>
        )}
        {state === "missing" && repoUrl && (
          <Button size="sm" variant="ghost" nativeButton={false} render={<a href={repoUrl} target="_blank" rel="noreferrer" />}>
            <ExternalLink />
            {t("about")}
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" title={t("dismiss")} aria-label={t("dismiss")} onClick={dismiss}>
          <X />
        </Button>
      </div>
    </div>
  );
}
