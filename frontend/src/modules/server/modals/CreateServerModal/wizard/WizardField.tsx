import { cn } from "@/shared/lib/cn";
import { Plate } from "@/shared/ui/plate";
import type { Tone } from "@/shared/ui/tone";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface WizardFieldProps {
  label: ReactNode;
  icon?: LucideIcon;
  htmlFor?: string;
  hint?: ReactNode;
  warning?: ReactNode;
  error?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

export function WizardField({ label, icon: Icon, htmlFor, hint, warning, error, wide, children }: WizardFieldProps) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", wide && "col-span-full")}>
      <label htmlFor={htmlFor} className="flex items-center gap-2 font-medium">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : warning ? (
        <p className="flex items-start gap-1.5 text-xs text-warn">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          {warning}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function WizardSection({ icon: Icon, tone, title, children }: { icon: LucideIcon; tone: Tone; title: ReactNode; children: ReactNode }) {
  return (
    <section className="not-first:mt-5 not-first:border-t not-first:border-border not-first:pt-5">
      <h3 className="mb-3 flex items-center gap-2.5 text-sm font-semibold">
        <Plate tone={tone} size="sm">
          <Icon />
        </Plate>
        {title}
      </h3>
      {children}
    </section>
  );
}
