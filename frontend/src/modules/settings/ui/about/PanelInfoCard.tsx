"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { GithubMark } from "@/shared/ui/GithubMark";
import LogoMark from "@/shared/ui/logo-mark";
import { Panel } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { Bug, Tags } from "lucide-react";
import { GITHUB_REPO_URL, useKubekVersionQuery } from "../../api/about.queries";
import { UpdateStatus } from "./UpdateStatus";
import { formatVersion } from "./version";

const EXTERNAL = { target: "_blank", rel: "noreferrer noopener" } as const;

export function PanelInfoCard() {
  const { t } = useTranslation("modules.settings.about");
  const version = useKubekVersionQuery();

  return (
    <Panel className="mb-6 flex-row flex-wrap items-center gap-5 p-5">
      <LogoMark size={64} />
      <div className="min-w-0 flex-1">
        <h2 className="flex items-baseline gap-2 text-[22px] font-semibold tracking-[-0.015em]">
          Kubek
          {version.data ? (
            <span className="font-mono text-[15px] font-medium text-muted-foreground">{formatVersion(version.data)}</span>
          ) : (
            <Skeleton className="h-4 w-14" />
          )}
        </h2>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{t("tagline")}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={GITHUB_REPO_URL} {...EXTERNAL} />}>
            <GithubMark className="size-3.5" />
            {t("links.github")}
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`${GITHUB_REPO_URL}/releases`} {...EXTERNAL} />}>
            <Tags />
            {t("links.releases")}
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`${GITHUB_REPO_URL}/issues/new`} {...EXTERNAL} />}>
            <Bug />
            {t("links.issues")}
          </Button>
        </div>
      </div>
      <UpdateStatus />
    </Panel>
  );
}
