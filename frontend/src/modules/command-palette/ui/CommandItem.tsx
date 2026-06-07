"use client";
import { cn } from "@/shared/lib/cn";
import React, { useEffect, useRef } from "react";
import type { CommandAction } from "../types/command.types";

interface CommandItemProps {
  action: CommandAction;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}

const CommandItem: React.FC<CommandItemProps> = ({
  action,
  active,
  onSelect,
  onHover,
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = action.icon;

  // Keep the keyboard-highlighted item within view
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      // Use mousedown so the action fires before the input blur closes the dialog
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      onMouseMove={onHover}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-primary" : "text-muted-foreground"
          )}
        />
      )}
      <span className="flex-1 truncate text-foreground">{action.label}</span>
      {action.hint && (
        <span className="shrink-0 truncate text-xs text-muted-foreground/80">
          {action.hint}
        </span>
      )}
    </button>
  );
};

export default CommandItem;
