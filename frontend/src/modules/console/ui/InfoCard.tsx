import { cn } from "@/shared/lib/cn";
import React from "react";

interface InfoCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  iconBgClass: string;
  iconTextClass: string;
  action?: React.ReactNode;
  onClick?: () => void;
  asButton?: boolean;
  className?: string;
}

export const InfoCard = React.forwardRef<
  HTMLElement,
  InfoCardProps & React.HTMLAttributes<HTMLElement>
>(function InfoCard(
  {
    icon: Icon,
    label,
    value,
    iconBgClass,
    iconTextClass,
    action,
    onClick,
    asButton,
    className,
    ...rest
  },
  ref
) {
  const interactive = !!onClick || asButton;

  const inner = (
    <div className="flex w-full items-center gap-3">
      <div className={`shrink-0 rounded-md p-1.5 ${iconBgClass}`}>
        <Icon className={`h-3.5 w-3.5 ${iconTextClass}`} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          {label}
        </div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
      {action && <div className="flex shrink-0 items-center">{action}</div>}
    </div>
  );

  const baseClass = cn(
    "rounded-xl border border-border/40 bg-secondary/20 px-3 py-2.5 transition-colors",
    interactive && "w-full cursor-pointer text-left hover:bg-secondary/40",
    className
  );

  if (interactive) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={baseClass}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={baseClass}
      {...(rest as React.HTMLAttributes<HTMLDivElement>)}
    >
      {inner}
    </div>
  );
});
