"use client";

import { cn } from "@/shared/lib/cn";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import Link from "next/link";
import { type ComponentType, type ReactNode } from "react";
import { NAV_ITEM_BASE } from "./navItemBase";

// Both static (Lucide) and extension-provided icons render the same way here
export type NavIcon = ComponentType<{ className?: string }>;

export function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
}: {
  href: string;
  icon: NavIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: ReactNode;
}) {
  const mini = useSidebarStore((s) => s.mini);

  return (
    <Tooltip disabled={!mini}>
      <TooltipTrigger
        render={
          <Link
            href={href}
            onClick={onClick}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              NAV_ITEM_BASE,
              "outline-none hover:bg-hover hover:text-foreground focus-visible:bg-hover focus-visible:text-foreground",
              "aria-[current=page]:bg-primary/12 aria-[current=page]:text-foreground aria-[current=page]:[&>svg]:text-primary",
              "before:absolute before:inset-y-2.5 before:-left-3 before:w-[3px] before:rounded-r-[3px] before:bg-primary before:opacity-0 aria-[current=page]:before:opacity-100 sidebar-mini:before:-left-2"
            )}
          />
        }
      >
        <Icon />
        <span>{label}</span>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
