"use client";

import type { NavItem } from "@/modules/sidebar/data/navigation";
import { ChevronDown } from "lucide-react";
import { sectionPath } from "@/shared/lib/routeTabs";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

interface AdminNavigationSectionProps {
  items: NavItem[];
  title: string;
  renderItem: (item: NavItem) => ReactNode;
}

/** Collapsible "Administration" group, always expanded in the collapsed sidebar */
export function AdminNavigationSection({ items, title, renderItem }: AdminNavigationSectionProps) {
  const pathname = usePathname();
  const hasActive = items.some((item) => item.href === sectionPath(pathname));
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  // Follow the route until the user toggles the group themselves
  const open = userOpen ?? hasActive;

  if (items.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        aria-expanded={open}
        className="group/admin flex w-full cursor-pointer items-center justify-between px-2 pt-3 pb-1 outline-none sidebar-mini:pointer-events-none sidebar-mini:py-2"
      >
        <span className="label-caps group-hover/admin:text-foreground sidebar-mini:hidden">{title}</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 ease-smooth group-aria-[expanded=false]/admin:-rotate-90 sidebar-mini:hidden" />
        <span className="hidden h-px w-full bg-sidebar-border sidebar-mini:block" />
      </button>
      <div
        data-open={open || undefined}
        className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-250 ease-smooth data-open:grid-rows-[1fr] sidebar-mini:grid-rows-[1fr]"
      >
        <div className="-ml-3 min-h-0 overflow-hidden pl-3">{items.map(renderItem)}</div>
      </div>
    </div>
  );
}
