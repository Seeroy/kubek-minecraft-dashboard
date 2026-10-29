"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { AlertCircle, ArrowUpCircle, CheckCircle2, ExternalLink, RotateCw } from "lucide-react";
import { GITHUB_REPO_URL, useUpdateCheckQuery } from "../../api/about.queries";
import { formatVersion } from "./version";

/** Update state on the right of the panel card, with a manual recheck */
export function UpdateStatus() {
  const { t } = useTranslation("modules.settings.about");
  const update = useUpdateCheckQuery();
  const checking = update.isFetching;

  const badge = checking ? (
    <Badge variant="secondary">
      <RotateCw className="animate-spin" />
      {t("checking")}
    </Badge>
  ) : update.isError ? (
    <Badge variant="secondary">
      <AlertCircle />
      {t("checkFailed")}
    </Badge>
  ) : update.data?.updateAvailable && update.data.latestVersion ? (
    <Badge variant="info">
      <ArrowUpCircle />
      {t("updateAvailable", formatVersion(update.data.latestVersion))}
    </Badge>
  ) : (
    <Badge variant="success">
      <CheckCircle2 />
      {t("upToDate")}
    </Badge>
  );

  return (
    <div className="grid justify-items-end gap-2 max-sm:justify-items-start">
      {badge}
      {update.data?.updateAvailable && !checking ? (
        <Button size="sm" nativeButton={false} render={<a href={`${GITHUB_REPO_URL}/releases/latest`} target="_blank" rel="noreferrer noopener" />}>
          {t("openRelease")}
          <ExternalLink />
        </Button>
      ) : (
        <Button variant="ghost" size="sm" disabled={checking} onClick={() => void update.refetch()}>
          <RotateCw />
          {t("checkAgain")}
        </Button>
      )}
    </div>
  );
}
