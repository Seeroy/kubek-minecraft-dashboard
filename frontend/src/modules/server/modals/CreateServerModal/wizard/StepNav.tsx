import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Check } from "lucide-react";
import { Fragment } from "react";

export const WIZARD_STEPS = ["type", "basics", "advanced", "create"] as const;

interface StepNavProps {
  current: number;
  /** Other wizards pass their own steps and labels */
  steps?: readonly string[];
  label?: (key: string) => string;
}

export function StepNav({ current, steps = WIZARD_STEPS, label }: StepNavProps) {
  const { t } = useTranslation("modules.newServerModal.steps");

  return (
    <nav className="flex shrink-0 scrollbar-hide items-center gap-2 overflow-x-auto border-b border-border px-5 py-3">
      {steps.map((key, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={key}>
            {i > 0 && <span className="h-px min-w-4 flex-1 bg-border" />}
            <span
              aria-current={active ? "step" : undefined}
              className={cn("flex items-center gap-2 text-[13px] font-medium whitespace-nowrap text-muted-foreground", active && "text-foreground")}
            >
              <span
                className={cn(
                  "grid size-[22px] place-items-center rounded-full border border-border text-[11.5px] font-semibold transition-colors duration-200",
                  active && "border-transparent bg-primary text-primary-foreground",
                  done && "border-transparent bg-success/18 text-success"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="max-sm:hidden">{label ? label(key) : t(`${key}.label`)}</span>
            </span>
          </Fragment>
        );
      })}
    </nav>
  );
}
