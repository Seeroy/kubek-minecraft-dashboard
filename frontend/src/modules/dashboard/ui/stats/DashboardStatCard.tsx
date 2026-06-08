"use client";
import { cn } from "@/shared/lib/cn";
import { Skeleton } from "@/shared/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import React from "react";

export type StatAccent = "emerald" | "blue" | "purple" | "amber";

interface AccentTokens {
  /** Icon plate background + text + inset ring */
  plate: string;
  /** Decorative corner glow gradient */
  glow: string;
  /** Footer leading dot */
  dot: string;
}

// Each card owns one accent so the row reads as four distinct, color-coded metrics
const ACCENTS: Record<StatAccent, AccentTokens> = {
  emerald: {
    plate: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
    glow: "from-emerald-500/25",
    dot: "bg-emerald-500",
  },
  blue: {
    plate: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
    glow: "from-blue-500/25",
    dot: "bg-blue-500",
  },
  purple: {
    plate: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
    glow: "from-purple-500/25",
    dot: "bg-purple-400",
  },
  amber: {
    plate: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
    glow: "from-amber-500/25",
    dot: "bg-amber-500",
  },
};

interface DashboardStatCardProps {
  kicker: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
  icon: LucideIcon;
  accent: StatAccent;
  loading?: boolean;
}

function DashboardStatCard({
  kicker,
  value,
  footer,
  icon: Icon,
  accent,
  loading,
}: DashboardStatCardProps) {
  const c = ACCENTS[accent];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 p-3.5 shadow-sm transition-colors hover:border-border">
      {/* Accent glow anchored to the icon corner (top-right), brightening on hover */}
      <div
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-gradient-to-br to-transparent opacity-90 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
          c.glow
        )}
      />

      <div className="relative flex items-center justify-between gap-3">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {kicker}
        </span>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            c.plate
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {loading ? (
        <Skeleton className="relative mt-2 h-7 w-20" />
      ) : (
        <div className="relative mt-2 text-2xl font-bold tracking-tight tabular-nums">
          {value}
        </div>
      )}

      {footer ? (
        <div className="relative mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} />
          {loading ? <Skeleton className="h-3 w-16" /> : footer}
        </div>
      ) : null}
    </div>
  );
}

export default DashboardStatCard;
