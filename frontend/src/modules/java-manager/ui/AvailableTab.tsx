"use client";
import type { JavaVersion } from "@/api/java/java.model";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Meter } from "@/shared/ui/meter";
import { Plate } from "@/shared/ui/plate";
import { SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Download } from "lucide-react";
import { gameRangeOf, javaTone, LTS, majorOf } from "../lib/java";

interface AvailableTabProps {
  available: JavaVersion[];
  progress: Record<string, number>;
  // Version whose install request is still on its way
  pending: string | undefined;
  /** Missing when the user may not install */
  onInstall?: (version: JavaVersion) => void;
}

export function AvailableTab({ available, progress, pending, onInstall }: AvailableTabProps) {
  const { t } = useTranslation("modules.javaManager.available");

  return (
    <SettingsGroup tone="blue" icon={Download} title={t("title")} description={t("description")} className="mb-0" flush>
      {available.length === 0 ? (
        <p className="p-6 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">{t("headers.version")}</TableHead>
              <TableHead className="w-28">{t("headers.support")}</TableHead>
              <TableHead className="hidden @xl/table:table-cell">{t("headers.purpose")}</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {available.map((version) => {
              const major = majorOf(version.version);
              const percent = progress[version.version];
              const lts = !!major && LTS.has(major);
              const range = gameRangeOf(major);
              return (
                <TableRow key={version.version} className="h-[58px]">
                  <TableCell className="pl-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Plate tone={javaTone(major)} size="lg" className="text-[13px] font-bold tabular-nums">
                        {major ?? "?"}
                      </Plate>
                      <div className="min-w-0">
                        <b className="block truncate font-semibold">{version.name}</b>
                        <span className="block truncate text-xs text-muted-foreground">{version.vendor ?? "Temurin"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger render={<Badge variant={lts ? "info" : "secondary"} className="cursor-help" />}>
                        {lts ? t("lts") : t("sts")}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">{lts ? t("ltsHint") : t("stsHint")}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden truncate text-[12.5px] text-muted-foreground @xl/table:table-cell">
                    {range && (range.to ? t("range", range.from, range.to) : t("newer", range.from))}
                  </TableCell>
                  <TableCell className="pr-4">
                    {percent != null ? (
                      <div className="grid gap-1 text-xs text-muted-foreground">
                        <Meter value={percent} tone={javaTone(major)} size="md" aria-label={t("installing", percent)} />
                        <span className="tabular-nums">{t("installing", percent)}</span>
                      </div>
                    ) : onInstall ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto flex"
                        disabled={pending === version.version}
                        onClick={() => onInstall(version)}
                      >
                        {pending === version.version ? <Spinner /> : <Download />}
                        {t("install")}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </SettingsGroup>
  );
}
