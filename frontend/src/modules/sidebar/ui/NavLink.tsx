"use client";

import { cn } from "@/shared/lib/cn";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import Link, { useLinkStatus } from "next/link";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { useNavPending } from "../store/nav-pending.store";
import { NAV_ITEM_BASE } from "./navItemBase";

// Both static (Lucide) and extension-provided icons render the same way here
export type NavIcon = ComponentType<{ className?: string }>;

// Lives inside the Link, its status is only readable from there
function PendingReporter({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  const setHref = useNavPending((s) => s.setHref);

  useEffect(() => {
    if (!pending) return;
    setHref(href);
    // Another link may have taken over by the time this one settles
    return () => {
      if (useNavPending.getState().href === href) setHref(null);
    };
  }, [pending, href, setHref]);

  return null;
}

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
        <PendingReporter href={href} />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
