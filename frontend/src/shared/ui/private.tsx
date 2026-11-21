"use client";
import { useStreamerHidden } from "@/shared/hooks/useStreamerMode";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { maskValue, type Sensitivity } from "@/shared/lib/streamer-mode";
import type { ReactNode } from "react";

interface PrivateProps {
  children: ReactNode;
  /** basic for what can't be changed later like IPs, secret for keys and tokens that can be rotated */
  level?: Sensitivity;
  className?: string;
}

// No reveal on hover, a stray cursor would show it on stream
export function Private({ children, level = "basic", className }: PrivateProps) {
  const hidden = useStreamerHidden(level);
  const { t } = useTranslation("modules.components.streamerMode");
  const text = typeof children === "string" || typeof children === "number";

  return (
    <span data-private={level} className={className} title={hidden ? t("hidden") : undefined}>
      {hidden && text ? maskValue(String(children)) : children}
    </span>
  );
}
