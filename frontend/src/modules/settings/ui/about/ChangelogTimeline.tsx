"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useGithubReleasesQuery, type GithubRelease } from "@/modules/settings/api/about.queries";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { AlertCircle, ExternalLink, History, RotateCw } from "lucide-react";
import { MarkdownLite } from "./MarkdownLite";
import { formatVersion } from "./version";

// Intl formatter for date
const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : DATE_FMT.format(ms);
}

export function ChangelogTimeline() {
  const { t } = useTranslation("modules.settings.about.changelog");
  const releasesQuery = useGithubReleasesQuery();

  const releases = releasesQuery.data ?? [];
  // First stable release marks the "current" node in the timeline
  const latestStableId = releases.find((r) => !r.prerelease)?.id;

  return (
    <SettingsGroup tone="blue" icon={History} title={t("title")} description={t("description")} flush>
      <div className="p-5">
        {releasesQuery.isLoading ? (
          <ChangelogSkeleton />
        ) : releasesQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("error")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => releasesQuery.refetch()}
            >
              <RotateCw />
              {t("retry")}
            </Button>
          </div>
        ) : releases.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ol className="relative">
            {releases.map((release, i) => (
              <ReleaseEntry
                key={release.id}
                release={release}
                isLatest={release.id === latestStableId}
                isLast={i === releases.length - 1}
              />
            ))}
          </ol>
        )}
      </div>
    </SettingsGroup>
  );
}

interface ReleaseEntryProps {
  release: GithubRelease;
  isLatest: boolean;
  isLast: boolean;
}

function ReleaseEntry({ release, isLatest, isLast }: ReleaseEntryProps) {
  const { t } = useTranslation("modules.settings.about.changelog");
  const date = formatDate(release.publishedAt);

  return (
    <li className={cn("relative pl-8", isLast ? "pb-0" : "pb-8")}>
      {/* Vertical connector between nodes */}
      {!isLast && (
        <span
          className="absolute top-3 bottom-0 left-[6px] w-px bg-border/70"
          aria-hidden
        />
      )}
      {/* Timeline node */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1.5 left-0 size-3.5 rounded-full border-2 border-card",
          isLatest
            ? "bg-primary ring-2 ring-primary/25"
            : "bg-muted-foreground/40"
        )}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-mono text-sm font-semibold">
            {formatVersion(release.tagName)}
          </span>
          {isLatest && (
            <Badge variant="success">{t("latest")}</Badge>
          )}
          {release.prerelease && (
            <Badge variant="warning">{t("prerelease")}</Badge>
          )}
          {date && (
            <span className="text-xs text-muted-foreground">{date}</span>
          )}
        </div>

        {release.name && release.name !== release.tagName && (
          <p className="text-sm leading-tight font-medium">{release.name}</p>
        )}

        {release.body?.trim() && (
          <div className="text-sm leading-relaxed text-muted-foreground">
            <MarkdownLite source={release.body} />
          </div>
        )}

        <Button
          variant="link"
          size="xs"
          nativeButton={false}
          className="h-auto px-0 text-muted-foreground hover:text-foreground"
          render={
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noreferrer noopener"
            />
          }
        >
          {t("viewOnGithub")}
          <ExternalLink />
        </Button>
      </div>
    </li>
  );
}

function ChangelogSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((i) => (
        <div key={i} className="relative space-y-3 pl-8">
          <span className="absolute top-1.5 left-0 size-3.5 rounded-full bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
