"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Spinner } from "@/shared/ui/spinner";
import { Download, ExternalLink, Lock, ServerOff } from "lucide-react";
import { useCompanion } from "../hooks/useCompanion";
import { useCompanionInstall } from "../hooks/useCompanionInstall";

interface CompanionRequiredProps {
  serverId: string;
  /** What the user would get, one short sentence */
  description: string;
  className?: string;
}

/** Placeholder for a whole section that only works with the plugin */
export function CompanionRequired({ serverId, description, className }: CompanionRequiredProps) {
  const { t } = useTranslation("modules.companion.required");
  const { state, overview } = useCompanion(serverId);
  const { install, pending, allowed } = useCompanionInstall(serverId);
  const unsupported = state === "unsupported";

  return (
    <Empty className={cn("rounded-lg border border-border bg-card py-14", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{unsupported ? <ServerOff /> : <Lock />}</EmptyMedia>
        <EmptyTitle>{t(unsupported ? "unsupported.title" : `${state === "missing" ? "missing" : "pending"}.title`)}</EmptyTitle>
        <EmptyDescription>
          {unsupported ? t("unsupported.description") : state === "missing" ? description : t(state === "waiting" ? "pending.waiting" : "pending.offline")}
        </EmptyDescription>
      </EmptyHeader>
      {state === "missing" && (
        <EmptyContent className="flex-row justify-center">
          {allowed && overview?.latest && (
            <Button disabled={pending} onClick={() => void install()}>
              {pending ? <Spinner /> : <Download />}
              {pending ? t("installing") : t("install")}
            </Button>
          )}
          {overview?.repoUrl && (
            <Button variant="outline" nativeButton={false} render={<a href={overview.repoUrl} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
              {t("about")}
            </Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}
