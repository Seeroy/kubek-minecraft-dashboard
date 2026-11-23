import { ArrowUp } from "lucide-react";

// Round update badge on a nav row, overrides the row's span rules (flex-1, hidden in mini)
export function UpdateIndicator({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className="ml-auto grid! size-[18px] flex-none! place-items-center overflow-visible! rounded-full bg-primary text-primary-foreground sidebar-mini:absolute sidebar-mini:top-1 sidebar-mini:right-1.5 sidebar-mini:size-3.5"
    >
      <ArrowUp className="size-3 sidebar-mini:size-2.5" strokeWidth={3} aria-hidden />
    </span>
  );
}
