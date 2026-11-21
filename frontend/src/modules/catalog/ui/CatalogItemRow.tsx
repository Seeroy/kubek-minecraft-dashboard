"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { GithubMark } from "@/shared/ui/GithubMark";
import { TableCell, TableRow } from "@/shared/ui/table";
import type { LucideIcon } from "lucide-react";
import { type CatalogEntry, type CatalogMark, sourceUrl } from "../lib/catalog";
import { CatalogAction } from "./CatalogAction";
import { MarkBadge, SourceBadge } from "./CatalogBadges";
import { CatalogIcon } from "./CatalogIcon";

interface CatalogItemRowProps {
  item: CatalogEntry;
  marks: CatalogMark[];
  icon: LucideIcon;
  installing: boolean;
  onInstall?: () => void;
}

export function CatalogItemRow({ item, marks, icon, installing, onInstall }: CatalogItemRowProps) {
  const { t } = useTranslation("modules.catalog");
  // Warnings first, the cell fits one badge, the rest go into the "+N" hint
  const [first, ...rest] = [...marks].sort((a, b) => Number(!!b.warning) - Number(!!a.warning));

  return (
    <TableRow className="h-[58px]">
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <CatalogIcon item={item} fallback={icon} />
          <div className="min-w-0">
            <b className="block truncate font-semibold">{item.name}</b>
            <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden truncate text-[12.5px] text-muted-foreground @3xl/table:table-cell">{item.author}</TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        <SourceBadge source={item.source} />
      </TableCell>
      <TableCell className="hidden font-mono text-[12.5px] text-muted-foreground @2xl/table:table-cell">
        {item.updateAvailable && item.installedVersion ? (
          <span>
            {item.installedVersion} <span className="text-primary">{`-> ${item.version}`}</span>
          </span>
        ) : (
          item.version
        )}
      </TableCell>
      <TableCell className="hidden @5xl/table:table-cell">
        {first && (
          <div className="flex min-w-0 items-center gap-1">
            <MarkBadge mark={first} className="max-w-full min-w-0 shrink" />
            {rest.length > 0 && (
              <Badge variant="secondary" className="tabular-nums" title={rest.map((mark) => mark.label).join("\n")}>
                +{rest.length}
              </Badge>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden truncate text-[12.5px] text-muted-foreground @4xl/table:table-cell">
        {item.updatedAt ? formatRelative(new Date(item.updatedAt).getTime(), t("justNow")) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <CatalogAction item={item} installing={installing} onInstall={onInstall} compact />
          <Button
            variant="ghost"
            size="icon-sm"
            title={t("source")}
            aria-label={t("source")}
            nativeButton={false}
            render={<a href={sourceUrl(item)} target="_blank" rel="noreferrer" />}
          >
            <GithubMark className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
