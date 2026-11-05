"use client";
import { X } from "lucide-react";
import type { CSSProperties } from "react";

interface NotificationCloseButtonProps {
  label: string;
  onClose: () => void;
  duration?: number;
}

/** Close button, a ring around it counts down the auto dismiss */
export default function NotificationCloseButton({ label, onClose, duration }: NotificationCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
    >
      {!!duration && (
        <svg viewBox="0 0 28 28" className="pointer-events-none absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="14" cy="14" r="12.5" fill="none" strokeWidth="2" className="stroke-tone/14" />
          <circle
            cx="14"
            cy="14"
            r="12.5"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            className="animate-toast-ring stroke-tone"
            style={{ "--toast-duration": `${duration}ms` } as CSSProperties}
          />
        </svg>
      )}
      <X className="size-3.5" />
    </button>
  );
}
