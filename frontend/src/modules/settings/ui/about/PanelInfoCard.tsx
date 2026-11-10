"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { GithubMark } from "@/shared/ui/GithubMark";
import LogoMark from "@/shared/ui/logo-mark";
import { Panel } from "@/shared/ui/panel";
import { Bug, RotateCw, Tags } from "lucide-react";
import { GITHUB_REPO_URL, useKubekVersionQuery } from "../../api/about.queries";
import { SAMPLE_PANEL_VERSION } from "../../data/samples";
import { UpdateStatus } from "./UpdateStatus";
import { formatVersion } from "./version";

const EXTERNAL = { target: "_blank", rel: "noreferrer noopener" } as const;

export function PanelInfoCard() {
  const { t } = useTranslation("modules.settings.about");
  const { t: tLoad } = useTranslation("modules.components.loadError");
  const version = useKubekVersionQuery();

  return (
    <Panel className="mb-6 flex-row flex-wrap items-center gap-5 p-5">
      <LogoMark size={64} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[22px] font-semibold tracking-[-0.015em]">Kubek</h2>
          <DataReveal
            id="settings-about-version"
            data={version.data}
            sample={SAMPLE_PANEL_VERSION}
            className="inline-block"
            // A full error block would swamp the heading, a quiet retry is enough here
            error={
              version.isError &&
              !version.data && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-mono text-[15px] font-medium text-muted-foreground hover:text-foreground"
                  title={tLoad("title")}
                  aria-label={tLoad("retry")}
                  disabled={version.isFetching}
                  onClick={() => void version.refetch()}
                >
                  —
                  <RotateCw className={cn("size-3.5", version.isFetching && "animate-spin")} />
                </button>
              )
            }
          >
            {(value) => <span className="font-mono text-[15px] font-medium text-muted-foreground">{formatVersion(value)}</span>}
          </DataReveal>
        </div>
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
