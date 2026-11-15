import { cn } from "@/shared/lib/cn";

/** Thin indeterminate bar, fades in late so quick loads do not flash it */
export function LoadingBar({ className }: { className?: string }) {
  return (
    <div
      role="progressbar"
      aria-busy
      className={cn(
        "pointer-events-none absolute inset-x-0 h-[3px] animate-in overflow-hidden bg-primary/15 delay-150 duration-200 fill-mode-both fade-in",
        className
      )}
    >
      <div className="h-full w-1/3 animate-loading-bar rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
    </div>
  );
}
