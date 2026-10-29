"use client";

import { useServerStore } from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useCurrentSection } from "@/modules/sidebar/hooks/useCurrentSection";
import { useTranslation } from "@/shared/hooks/useTranslation";

export function Crumbs() {
  const { t } = useTranslation("modules.sidebar.layout");
  const section = useCurrentSection();
  const { selectedServer } = useServerStore();
  const showServer = section?.serverScoped && selectedServer;
  const Icon = section?.icon;

  return (
    <nav aria-label={t("breadcrumb")} className="flex min-w-0 items-center gap-2 text-[13px]">
      {showServer && (
        <>
          <ServerAvatar
            serverId={selectedServer.id}
            name={selectedServer.name}
            className="size-[18px] rounded-[4px] max-md:hidden"
          />
          <span className="truncate text-muted-foreground max-md:hidden">{selectedServer.name}</span>
          <span aria-hidden className="text-muted-foreground/50 max-md:hidden">
            /
          </span>
        </>
      )}
      {section && Icon && (
        <span className="inline-grid h-6 items-center overflow-hidden" aria-live="polite">
          {/* Keyed so each section change replays the slide in */}
          <span
            key={section.key}
            aria-current="page"
            className="inline-flex animate-crumb-in items-center gap-1.5 font-semibold whitespace-nowrap"
          >
            <Icon className="size-3.5 text-primary" />
            {section.label}
          </span>
        </span>
      )}
    </nav>
  );
}
