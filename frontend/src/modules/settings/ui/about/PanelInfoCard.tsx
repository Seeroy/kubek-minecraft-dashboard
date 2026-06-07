"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  GITHUB_REPO_URL,
  useKubekVersionQuery,
  useUpdateCheckQuery,
} from "@/modules/settings/api/about.queries";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { GithubMark } from "@/shared/ui/GithubMark";
import LogoMark from "@/shared/ui/logo-mark";
import { Skeleton } from "@/shared/ui/skeleton";
import { Bug, Tags } from "lucide-react";
import { UpdateStatus } from "./UpdateStatus";
import { formatVersion } from "./version";

const EXTERNAL = { target: "_blank", rel: "noreferrer noopener" } as const;
const RELEASES_URL = `${GITHUB_REPO_URL}/releases`;

export function PanelInfoCard() {
  const { t } = useTranslation("modules.settings");
  const versionQuery = useKubekVersionQuery();
  const updateQuery = useUpdateCheckQuery();

  const current = versionQuery.data;

  return (
    <Card className="relative overflow-hidden">
      {/* Soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 px-5 sm:flex-row sm:items-center">
        <div className="flex size-20 flex-shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
          <LogoMark size={44} />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Kubek</h2>
            {current ? (
              <Badge variant="secondary" className="font-mono">
                {formatVersion(current)}
              </Badge>
            ) : (
              <Skeleton className="h-5 w-16 rounded-full" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("about.info.tagline")}
          </p>
          <UpdateStatus
            checking={updateQuery.isLoading}
            failed={updateQuery.isError}
            updatable={updateQuery.data?.updateAvailable ?? false}
            latestVersion={updateQuery.data?.latestVersion}
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="relative flex flex-wrap gap-2 border-t border-border/60 px-5 pt-5">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={GITHUB_REPO_URL} {...EXTERNAL} />}
        >
          <GithubMark className="size-4" />
          {t("about.info.links.github")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={RELEASES_URL} {...EXTERNAL} />}
        >
          <Tags />
          {t("about.info.links.releases")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={`${GITHUB_REPO_URL}/issues/new`} {...EXTERNAL} />}
        >
          <Bug />
          {t("about.info.links.issues")}
        </Button>
      </div>
    </Card>
  );
}
