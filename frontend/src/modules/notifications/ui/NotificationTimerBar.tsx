"use client";
import type { CSSProperties } from "react";

/** Determinate progress, or the auto dismiss countdown as a shrinking line */
export default function NotificationTimerBar({ progress, duration }: { progress?: number; duration?: number }) {
  if (progress !== undefined) {
    return (
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-tone/14">
        <div
          className="h-full origin-left bg-tone transition-[scale] duration-300 ease-out"
          style={{ scale: `${Math.min(Math.max(progress, 0), 100) / 100} 1` }}
        />
      </div>
    );
  }

  if (!duration) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-0 h-[3px] origin-left animate-toast-timer bg-tone/50"
      style={{ "--toast-duration": `${duration}ms` } as CSSProperties}
    />
  );
}
