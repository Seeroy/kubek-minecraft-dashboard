"use client";

import type { ContentKind } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { TableCell, TableRow } from "@/shared/ui/table";
import type { InstalledPluginView } from "@shared/types/plugins";
import { Check, Download, RotateCw, Trash2 } from "lucide-react";
import { getContentKind } from "../content-kind";
import { displayName, fileNameOf, primaryCategory } from "../lib/installed";
import { ProjectIcon } from "./ProjectIcon";

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" });

interface InstalledRowProps {
  item: InstalledPluginView;
  kind: ContentKind;
  /** Missing when the user may not do it */
  onUpdate?: (item: InstalledPluginView) => void;
  onRemove?: (item: InstalledPluginView) => void;
}

export function InstalledRow({ item, kind, onUpdate, onRemove }: InstalledRowProps) {
  const { t } = useTranslation("modules.content.installed");
  const { t: tk } = useTranslation(getContentKind(kind).i18nNs);
  const manual = item.type === "manual";
  const name = displayName(item);
  const file = fileNameOf(item);
  const latest = item.hasUpdate ? item.latestVersion?.versionNumber : undefined;

  return (
    <TableRow className="h-[58px]">
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <ProjectIcon title={name} iconUrl={item.metadata?.iconUrl} category={primaryCategory(item.metadata?.categories)} />
          <div className="min-w-0">
            <b className="block truncate font-semibold">{name}</b>
            <span className="block truncate text-xs text-muted-foreground">
              {manual ? t("uploadedManually") : item.metadata?.description}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="grid text-[12.5px] leading-snug">
          <span className="truncate font-mono">{item.version?.versionNumber ?? "—"}</span>
          {latest && (
            <span className="truncate font-mono text-[11.5px] text-warn" title={t("newerVersion")}>
              → {latest}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        <div className="flex flex-wrap gap-1">
          {manual ? null : latest ? (
            <Badge variant="warning">{t("badges.update")}</Badge>
          ) : (
            <Badge variant="success">
              <Check />
              {t("badges.upToDate")}
            </Badge>
          )}
          {manual && <Badge variant="secondary">{t("badges.manual")}</Badge>}
          {item.dependencyOf && <Badge variant="info">{t("badges.dependency")}</Badge>}
        </div>
      </TableCell>
      <TableCell className="hidden @4xl/table:table-cell">
        <span className="block max-w-52 truncate font-mono text-[11.5px] text-muted-foreground" title={file}>
          {file}
        </span>
      </TableCell>
      <TableCell className="hidden text-[12.5px] text-muted-foreground @3xl/table:table-cell">
        {dateFormat.format(item.installedAt)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-0.5">
          {!manual &&
            onUpdate &&
            (latest ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-warn hover:text-warn"
                title={t("updateTo", latest)}
                aria-label={t("updateTo", latest)}
                onClick={() => onUpdate(item)}
              >
                <Download />
              </Button>
            ) : (
              <Button variant="ghost" size="icon-sm" title={t("reinstall")} aria-label={t("reinstall")} onClick={() => onUpdate(item)}>
                <RotateCw />
              </Button>
            ))}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-danger/10 hover:text-danger"
              title={tk("remove.title")}
              aria-label={tk("remove.title")}
              onClick={() => onRemove(item)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
