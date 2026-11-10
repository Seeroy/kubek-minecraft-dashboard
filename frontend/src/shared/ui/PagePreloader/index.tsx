"use client";

import { useOOBE } from "@/shared/hooks/useOOBE";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import LogoMark from "@/shared/ui/logo-mark";
import { useEffect, useState } from "react";

const LOGO_SIZE = 64;
// Real progress is unknown, so the fill creeps up to here and waits
const WAIT_FILL = 85;
const FINISH_MS = 350;
const FADE_MS = 400;

type Phase = "loading" | "finishing" | "fading" | "gone";

const PagePreloader = () => {
  const { isLoading } = useOOBE();
  const { t } = useTranslation("modules.components.statusButton");
  const [phase, setPhase] = useState<Phase>("loading");
  const [fill, setFill] = useState(0);

  // Latched during render, background refetches of the profile never bring it back
  if (!isLoading && phase === "loading") setPhase("finishing");

  // Next frame so the creep actually transitions from zero
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFill(WAIT_FILL));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fill to the end, then fade, then leave the tree
  useEffect(() => {
    if (phase === "finishing") {
      const timer = setTimeout(() => setPhase("fading"), FINISH_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "fading") {
      const timer = setTimeout(() => setPhase("gone"), FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (phase === "gone") return null;

  const finished = phase !== "loading";
  const progress = finished ? 100 : fill;

  return (
    <div
      role="status"
      aria-busy={!finished}
      className={cn(
        "fixed inset-0 z-[99999] grid place-items-center bg-background transition-opacity duration-400 ease-smooth",
        phase === "fading" && "pointer-events-none opacity-0"
      )}
    >
      <div
        className={cn(
          "relative animate-preloader-in transition-transform duration-400 ease-smooth",
          phase === "fading" && "scale-[1.06]"
        )}
      >
        <div className="absolute -inset-10 rounded-full bg-primary/12 blur-2xl" aria-hidden />
        <LogoMark size={LOGO_SIZE} className="relative opacity-15 grayscale" />
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
            // Slow creep while waiting, a quick finish once the data is in
            transition: `clip-path ${finished ? FINISH_MS : 2600}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        >
          <LogoMark size={LOGO_SIZE} />
        </div>
      </div>
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
};

export default PagePreloader;
