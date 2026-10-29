"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Checkbox } from "@/shared/ui/checkbox";
import { Meter } from "@/shared/ui/meter";
import { useState } from "react";

interface EULAStepProps {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}

export function EULAStep({ accepted, onAcceptedChange }: EULAStepProps) {
  const { t } = useTranslation("modules.oobe.eula");
  // Accepting earlier means the text was already read
  const [percent, setPercent] = useState(accepted ? 100 : 0);
  const read = percent >= 99;

  const track = (box: HTMLElement) => {
    const next = Math.min(100, Math.round(((box.scrollTop + box.clientHeight) / box.scrollHeight) * 100));
    setPercent((prev) => Math.max(prev, next));
  };

  return (
    <>
      <div
        tabIndex={0}
        aria-label={t("title")}
        ref={(box) => {
          // Short text that fits without scrolling counts as read
          if (box) track(box);
        }}
        onScroll={(event) => track(event.currentTarget)}
        className="h-[330px] scrollbar-thin overflow-auto rounded-lg border border-border bg-background px-5 py-4 text-[13px] leading-relaxed text-foreground/85 outline-none focus-visible:ring-3 focus-visible:ring-primary/18 [&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-[13.5px] [&_h4]:font-semibold [&_h4]:text-foreground [&_p]:mb-2"
      >
        <h4 className="mt-0!">{t("title")}</h4>
        <div dangerouslySetInnerHTML={{ __html: t("content") }} />
      </div>

      <div className="mt-2 mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{read ? t("readFull") : t("read", percent)}</span>
        <Meter value={percent} tone="primary" className="flex-1" aria-label={t("read", percent)} />
      </div>

      <label
        title={read ? undefined : t("scrollHint")}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 text-[13.5px] transition-colors",
          !read && "cursor-not-allowed opacity-55",
          accepted && "border-success/45 bg-success/7"
        )}
      >
        <Checkbox checked={accepted} disabled={!read} onCheckedChange={onAcceptedChange} className="mt-px" />
        <span>
          {t("accept")}
          {!read && <span className="block text-xs text-muted-foreground">{t("scrollHint")}</span>}
        </span>
      </label>
    </>
  );
}
