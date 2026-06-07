import { cn } from "@/shared/lib/cn";
import { Lock, type LucideIcon } from "lucide-react";
import { NAV_ITEM_BASE } from "./navItemBase";

/** A locked, non-interactive nav cell shown when the user lacks permission */
export const LockedNavItem = ({
  icon: Icon,
  label,
  lockedLabel,
}: {
  icon: LucideIcon;
  label: string;
  lockedLabel: string;
}) => (
  <div
    aria-disabled="true"
    title={lockedLabel}
    className={cn(
      "group relative cursor-not-allowed text-muted-foreground/50 select-none",
      NAV_ITEM_BASE
    )}
  >
    <Icon className="h-5 w-5 shrink-0 text-muted-foreground/40" />
    <span className="relative z-10 font-medium md:min-w-0 md:flex-1 md:truncate">
      {label}
    </span>
    <Lock size={16} className="text-muted-foreground md:ml-auto" />
  </div>
);
