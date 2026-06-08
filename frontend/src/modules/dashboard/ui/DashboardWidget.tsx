"use client";
import { cn } from "@/shared/lib/cn";
import type { LucideIcon } from "lucide-react";
import { EyeOff, GripVertical } from "lucide-react";
import React from "react";

interface DashboardWidgetProps {
  title: string;
  icon: LucideIcon;
  editMode: boolean;
  onHide?: () => void;
  /** Override the inner content padding (default: p-3). Ignored in bare mode */
  contentClassName?: string;
  /** Render only the children + floating edit controls (no header/border) */
  bare?: boolean;
  children: React.ReactNode;
}

export default function DashboardWidget({
  title,
  icon: Icon,
  editMode,
  onHide,
  contentClassName,
  bare,
  children,
}: DashboardWidgetProps) {
  if (bare) {
    return (
      // Children own the card chrome; we layer drag/hide affordances over them
      <div className="relative h-full">
        {children}
        {editMode && (
          <>
            <div
              aria-label={title}
              className="dashboard-drag-handle absolute top-2 left-2 z-30 flex h-7 w-7 cursor-move items-center justify-center rounded-md bg-background/70 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            {onHide && (
              <button
                type="button"
                onClick={onHide}
                className="absolute top-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-md bg-background/70 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
                aria-label="Hide widget"
              >
                <EyeOff className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    // Surface matches the shared Card (rounded-2xl, gradient, soft shadow) so
    // widgets read as part of the same design language as the rest of the app
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 shadow-sm">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border/60 px-4 py-2.5",
          // .dashboard-drag-handle is the drag target configured on the grid
          editMode && "dashboard-drag-handle cursor-move select-none"
        )}
      >
        {editMode && (
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 truncate text-sm font-medium">{title}</span>
        {editMode && onHide && (
          <button
            type="button"
            onClick={onHide}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Hide widget"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className={cn("min-h-0 flex-1 overflow-auto p-5", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
