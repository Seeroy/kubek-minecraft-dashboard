"use client";

import { allNavigation } from "@/modules/sidebar/data/navigation";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { sectionPath } from "@/shared/lib/routeTabs";
import { PageHeader } from "@/shared/ui/page-header";
import { Panel, PanelHead } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { usePathname } from "next/navigation";

const ROWS = 6;

// PageHeader puts these into h1 and p, a div skeleton is not allowed there
const Bar = ({ className }: { className: string }) => (
  <span className={cn("inline-block skeleton-shimmer rounded-sm align-middle", className)} />
);

// Shown right after a section click while its code loads, the URL is already new
export default function SectionLoading() {
  const { t } = useTranslation("modules.sidebar");
  // Not useCurrentSection, its useSearchParams breaks the static prerender of this fallback
  const section = sectionPath(usePathname());
  const item = allNavigation.find((entry) => entry.href === section);

  return (
    <div aria-busy>
      <PageHeader
        title={item ? t(item.nameKey) : <Bar className="h-6 w-40" />}
        description={<Bar className="h-3.5 w-72 max-w-full" />}
      />
      <Panel>
        <PanelHead>
          <Skeleton className="h-3.5 w-32" />
        </PanelHead>
        <div className="grid gap-4 p-4">
          {Array.from({ length: ROWS }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
