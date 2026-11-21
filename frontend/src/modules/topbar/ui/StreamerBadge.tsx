"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { EyeOff } from "lucide-react";

// No toggle here, turning it off on stream should take a deliberate click
export function StreamerBadge() {
  const { t } = useTranslation("modules.components.streamerMode");

  return (
    <span
      title={t("badgeHint")}
      className="hidden h-6 shrink-0 items-center gap-1.5 rounded-full bg-c-pink/14 px-2 text-[11.5px] font-medium text-c-pink streamer:inline-flex max-sm:px-1.5"
    >
      <EyeOff className="size-3.5" />
      {/* Classes from the boot script pick the label, so it is right before hydration */}
      <span className="max-sm:hidden">
        <span className="streamer-full:hidden">{t("badgeBasic")}</span>
        <span className="hidden streamer-full:inline">{t("badgeFull")}</span>
      </span>
    </span>
  );
}
