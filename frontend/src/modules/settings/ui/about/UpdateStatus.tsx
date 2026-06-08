"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { GITHUB_REPO_URL } from "@/modules/settings/api/about.queries";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatVersion } from "./version";

const EXTERNAL = { target: "_blank", rel: "noreferrer noopener" } as const;

interface UpdateStatusProps {
  checking: boolean;
  failed: boolean;
  updatable: boolean;
  latestVersion: string | undefined;
}

/** Inline pill summarizing whether the panel is up to date */
export function UpdateStatus({
  checking,
  failed,
  updatable,
  latestVersion,
}: UpdateStatusProps) {
  const { t } = useTranslation("modules.settings");

  if (checking) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("about.info.checking")}
      </span>
    );
  }

  if (failed) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="size-4" />
        {t("about.info.checkFailed")}
      </span>
    );
  }

  if (updatable && latestVersion) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowUpCircle className="size-4" />
          {t("about.info.updateAvailable")} {formatVersion(latestVersion)}
        </span>
        <Button
          size="xs"
          nativeButton={false}
          render={
            <a href={`${GITHUB_REPO_URL}/releases/latest`} {...EXTERNAL} />
          }
        >
          {t("about.info.updateCta")}
          <ExternalLink />
        </Button>
      </div>
    );
  }

  return (
    <Badge variant="success" className="gap-1.5">
      <CheckCircle2 className="size-3" />
      {t("about.info.upToDate")}
    </Badge>
  );
}
