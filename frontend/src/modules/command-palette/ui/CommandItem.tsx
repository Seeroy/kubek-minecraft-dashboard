"use client";
import { cn } from "@/shared/lib/cn";
import { menuItem } from "@/shared/ui/styles";
import { useEffect, useRef } from "react";
import type { CommandAction } from "../types/command.types";

interface CommandItemProps {
  action: CommandAction;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}

export default function CommandItem({ action, active, onSelect, onHover }: CommandItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = action.icon;

  // Keep the keyboard highlighted item within view
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={active}
      // Mousedown fires before the input blur closes the dialog
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect();
      }}
      onMouseMove={onHover}
      className={cn(menuItem, "cursor-pointer aria-selected:bg-hover")}
    >
      {Icon && <Icon />}
      <span className="flex-1 truncate">{action.label}</span>
      {action.hint && <span className="shrink-0 truncate text-[11.5px] text-muted-foreground">{action.hint}</span>}
    </button>
  );
}
