import { cn } from "@/shared/lib/cn";
import { toneClass, type Tone } from "@/shared/ui/tone";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function IconLabel({ icon: Icon, tone, children }: { icon: LucideIcon; tone: Tone; children: ReactNode }) {
  return (
    <span className={cn(toneClass[tone], "inline-flex items-center gap-1.5")}>
      <Icon className="size-3.5 shrink-0 text-tone" />
      {children}
    </span>
  );
}
