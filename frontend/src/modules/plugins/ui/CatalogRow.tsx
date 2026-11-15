"use client";

import type { ContentKind } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Spinner } from "@/shared/ui/spinner";
import { TableCell, TableRow } from "@/shared/ui/table";
import type { ModrinthSearchHit } from "@shared/types/plugins";
import { AlertTriangle, Check, Download, Info } from "lucide-react";
import { getContentKind } from "../content-kind";
import { primaryCategory } from "../lib/installed";
import { ProjectIcon } from "./ProjectIcon";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

interface CatalogRowProps {
  hit: ModrinthSearchHit;
  kind: ContentKind;
  installed: boolean;
  installing: boolean;
  /** MC version the project has no build for */
  incompatibleWith?: string;
  /** Missing when the user may not install */
  onInstall?: () => void;
  onDetails: () => void;
  selected: boolean;
  /** Missing when the project can't be picked for a bulk install */
  onSelect?: (selected: boolean) => void;
}

export function CatalogRow({ hit, kind, installed, installing, incompatibleWith, onInstall, onDetails, selected, onSelect }: CatalogRowProps) {
  const { t } = useTranslation("modules.content");
  const { t: tk } = useTranslation(getContentKind(kind).i18nNs);
  const serverSide = hit.server_side !== "unsupported";
  // Modrinth lists versions oldest first
  const newest = hit.versions.at(-1);

  return (
    <TableRow className="h-[58px] cursor-pointer" data-state={selected ? "selected" : undefined} onClick={onDetails}>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          {/* Every row keeps the box so the column lines up, installed ones show it checked */}
          {onInstall && (
            <span className="flex" onClick={(event) => event.stopPropagation()} title={installed ? t("catalog.installed") : undefined}>
              <Checkbox checked={selected || installed} disabled={!onSelect} onCheckedChange={onSelect} aria-label={t("catalog.select")} />
            </span>
          )}
          <ProjectIcon title={hit.title} iconUrl={hit.icon_url} category={primaryCategory(hit.display_categories)} />
          <div className="min-w-0">
            <b className="block truncate font-semibold">{hit.title}</b>
            <span className="block truncate text-xs text-muted-foreground">{hit.description}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden truncate text-[12.5px] text-muted-foreground @3xl/table:table-cell">{hit.author}</TableCell>
      <TableCell
        className="hidden text-right text-[12.5px] text-muted-foreground tabular-nums @2xl/table:table-cell"
        title={t("catalog.downloads", hit.downloads)}
      >
        {compact.format(hit.downloads)}
      </TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        {newest && (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="font-mono">
              {newest}
            </Badge>
            {hit.versions.length > 1 && <span className="text-[11.5px] text-muted-foreground">{t("catalog.moreVersions", hit.versions.length - 1)}</span>}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden truncate text-[12.5px] text-muted-foreground @4xl/table:table-cell">
        {hit.date_modified ? formatRelative(new Date(hit.date_modified).getTime(), t("catalog.justNow")) : "—"}
      </TableCell>
      <TableCell>
        {/* Row click opens the details, the buttons must not */}
        <div className="flex items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
          {installed ? (
            <Badge variant="success">
              <Check />
              {t("catalog.installed")}
            </Badge>
          ) : (
            onInstall &&
            (installing ? (
              <Button variant="ghost" size="icon-sm" disabled title={t("catalog.installing")} aria-label={t("catalog.installing")}>
                <Spinner />
              </Button>
            ) : serverSide && incompatibleWith ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-warn hover:text-warn"
                title={`${t("catalog.incompatible", incompatibleWith)} · ${t("catalog.chooseVersion")}`}
                aria-label={t("catalog.chooseVersion")}
                onClick={onDetails}
              >
                <AlertTriangle />
              </Button>
            ) : serverSide ? (
              <Button variant="ghost" size="icon-sm" className="text-c-blue hover:text-c-blue" title={t("catalog.install")} aria-label={t("catalog.install")} onClick={onInstall}>
                <Download />
              </Button>
            ) : (
              <Badge variant="secondary" title={tk("unsupported")}>
                {t("catalog.clientOnly")}
              </Badge>
            ))
          )}
          <Button variant="ghost" size="icon-sm" title={t("catalog.details")} aria-label={t("catalog.details")} onClick={onDetails}>
            <Info />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
