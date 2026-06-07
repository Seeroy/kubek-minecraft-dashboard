"use client";
import { cn } from "@/shared/lib/cn";
import { motion } from "framer-motion";

const solidMap: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  progress: "bg-primary",
};

const fadedMap: Record<string, string> = {
  info: "bg-blue-500/50",
  success: "bg-emerald-500/50",
  warning: "bg-amber-500/50",
  error: "bg-red-500/50",
  progress: "bg-primary/60",
};

export default function NotificationTimerBar({
  type = "info",
  progress,
  duration,
}: {
  type?: string;
  progress?: number;
  duration?: number;
}) {
  // Determinate progress takes priority over the countdown
  if (progress !== undefined) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-foreground/5">
        <div
          className={cn(
            "h-full transition-[width] duration-300 ease-out",
            solidMap[type] ?? solidMap.info
          )}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    );
  }

  // Auto-dismiss countdown: thin, faded bar shrinking over the lifetime
  if (duration && duration > 0) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]">
        <motion.div
          className={cn("h-full origin-left", fadedMap[type] ?? fadedMap.info)}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
        />
      </div>
    );
  }

  return null;
}
