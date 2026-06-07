import { cn } from "@/shared/lib/cn";
import Link from "next/link";
import { type ComponentType, type ReactNode } from "react";
import { NAV_ITEM_BASE } from "./navItemBase";

// Both static (Lucide) and extension-provided icons render the same way here
export type NavIcon = ComponentType<{ className?: string }>;

export const NavLink = ({
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
}) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn(
      "group relative transition-all duration-200 hover:bg-sidebar-accent/50",
      NAV_ITEM_BASE,
      isActive
        ? "border-primary/40 bg-sidebar-accent text-sidebar-accent-foreground md:border-0 md:bg-sidebar-accent"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    {/* Active Indicator (Left edge) - desktop only */}
    <div
      className={cn(
        "absolute top-1/2 -left-3 hidden w-0.5 -translate-y-1/2 rounded-r-full transition-all duration-200 md:block",
        isActive ? "h-5 bg-primary" : "h-0 bg-transparent"
      )}
    />

    <Icon
      className={cn(
        "h-5 w-5 shrink-0 transition-colors duration-200 md:h-[18px] md:w-[18px]",
        isActive
          ? "text-primary"
          : "text-muted-foreground group-hover:text-foreground"
      )}
    />

    <span className="relative z-10 line-clamp-2 leading-tight font-medium md:line-clamp-none md:min-w-0 md:flex-1 md:truncate">
      {label}
    </span>

    {badge}
  </Link>
);
