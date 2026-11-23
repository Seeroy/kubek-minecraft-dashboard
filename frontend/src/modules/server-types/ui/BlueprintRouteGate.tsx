"use client";
import { useServerStore } from "@/modules/server";
import { useBlueprint, useBlueprints } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { sectionPath } from "@/shared/lib/routeTabs";
import { BASE_FEATURE_ROUTES, baseFeatureAllowed } from "@/shared/lib/serverRestrictions";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { ServerOff } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Same rule as the sidebar, so a typed URL to a page the server type lacks shows a plain notice */
export function BlueprintRouteGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("modules.serverTypes.missingFeature");
  const feature = BASE_FEATURE_ROUTES[sectionPath(usePathname())];
  const { selectedServer, servers, selectServer } = useServerStore();
  const blueprint = useBlueprint(feature ? selectedServer?.blueprintId : undefined);
  const { data: blueprints } = useBlueprints({ enabled: !!feature });

  // Unknown blueprint or no server, the page handles that itself
  if (!feature || !selectedServer || !blueprint || baseFeatureAllowed(blueprint, feature)) return children;

  const alternative = servers.find((s) => {
    const bp = blueprints?.find((b) => b.id === s.blueprintId);
    return bp && baseFeatureAllowed(bp, feature);
  });

  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ServerOff />
        </EmptyMedia>
        <EmptyTitle>{t(`title.${feature}`)}</EmptyTitle>
        <EmptyDescription>{t("description", selectedServer.name)}</EmptyDescription>
      </EmptyHeader>
      {alternative && (
        <EmptyContent>
          <Button onClick={() => selectServer(alternative.id)}>{t("switchTo", alternative.name)}</Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
