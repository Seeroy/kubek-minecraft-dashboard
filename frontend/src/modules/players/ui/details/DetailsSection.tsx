import { Plate } from "@/shared/ui/plate";
import type { Tone } from "@/shared/ui/tone";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface DetailsSectionProps {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  children: ReactNode;
}

export function DetailsSection({ title, icon: Icon, tone, children }: DetailsSectionProps) {
  return (
    <section className="grid gap-2.5">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <Plate tone={tone} size="sm">
          <Icon />
        </Plate>
        {title}
      </h3>
      {children}
    </section>
  );
}
