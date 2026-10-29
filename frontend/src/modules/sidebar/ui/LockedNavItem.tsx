import { cn } from "@/shared/lib/cn";
import { Lock, type LucideIcon } from "lucide-react";
import { NAV_ITEM_BASE } from "./navItemBase";

/** A locked, non-interactive nav row shown when the user lacks permission */
export function LockedNavItem({
  icon: Icon,
  label,
  lockedLabel,
}: {
  icon: LucideIcon;
  label: string;
  lockedLabel: string;
}) {
  return (
    <div aria-disabled="true" title={lockedLabel} className={cn(NAV_ITEM_BASE, "cursor-not-allowed opacity-50 select-none")}>
      <Icon />
      <span>{label}</span>
      <Lock className="size-3.5! sidebar-mini:hidden" />
    </div>
  );
}
