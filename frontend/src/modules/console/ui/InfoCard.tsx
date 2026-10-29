import { cn } from "@/shared/lib/cn";
import { Plate } from "@/shared/ui/plate";
import { type Tone, toneClass } from "@/shared/ui/tone";
import type { ComponentProps, ComponentType, ReactNode } from "react";

interface InfoCardProps extends Omit<ComponentProps<"div">, "children"> {
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  label: ReactNode;
  value: ReactNode;
  extra?: ReactNode;
  action?: ReactNode;
}

/** One fact about the server in the console rail */
export function InfoCard({ icon: Icon, tone, label, value, extra, action, className, ...props }: InfoCardProps) {
  return (
    <div
      className={cn(toneClass[tone], "flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-card", className)}
      {...props}
    >
      <Plate tone={tone}>
        <Icon />
      </Plate>
      <div className="min-w-0 flex-1 text-left">
        <div className="label-caps">{label}</div>
        <div className="truncate text-sm font-semibold">{value}</div>
        {extra}
      </div>
      {action}
    </div>
  );
}
