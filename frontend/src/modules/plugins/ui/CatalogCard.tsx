"use client";

import type { ContentKind } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { toneClass } from "@/shared/ui/tone";
import type { ModrinthSearchHit } from "@shared/types/plugins";
import { Check, Clock, Download, Heart, Info, User } from "lucide-react";
import { getContentKind } from "../content-kind";
import { categoryTone } from "../lib/categories";
import { primaryCategory } from "../lib/installed";
import { ProjectIcon } from "./ProjectIcon";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const VISIBLE_VERSIONS = 3;

interface CatalogCardProps {
  hit: ModrinthSearchHit;
  kind: ContentKind;
  installed: boolean;
  /** Missing when the user may not install */
  onInstall?: () => void;
  onDetails: () => void;
}

export function CatalogCard({ hit, kind, installed, onInstall, onDetails }: CatalogCardProps) {
  const { t } = useTranslation("modules.content");
  const { t: tk } = useTranslation(getContentKind(kind).i18nNs);
  const category = primaryCategory(hit.display_categories);
  const serverSide = hit.server_side !== "unsupported";
  // Modrinth lists versions oldest first, the newest are the interesting ones
  const versions = hit.versions.slice(-VISIBLE_VERSIONS).reverse();

  return (
    <article className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4 transition-[border-color,translate,box-shadow] duration-200 ease-smooth hover:-translate-y-0.5 hover:border-foreground/18 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <ProjectIcon title={hit.title} iconUrl={hit.icon_url} category={category} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold">{hit.title}</h3>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="size-3" />
            {hit.author}
          </span>
        </div>
      </div>

      <p className="line-clamp-2 min-h-[37px] text-[12.5px] leading-normal text-muted-foreground">{hit.description}</p>

      <div className="flex gap-4 text-xs text-muted-foreground tabular-nums [&_svg]:size-3.5">
        <span className="inline-flex items-center gap-1" title={t("catalog.downloads", hit.downloads)}>
          <Download />
          {compact.format(hit.downloads)}
        </span>
        <span className="inline-flex items-center gap-1" title={t("catalog.followers", hit.follows)}>
          <Heart />
          {compact.format(hit.follows)}
        </span>
        {hit.date_modified && (
          <span className="inline-flex items-center gap-1" title={t("catalog.lastUpdate")}>
            <Clock />
            {formatRelative(new Date(hit.date_modified).getTime(), t("catalog.justNow"))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {category && (
          <Badge className={cn("bg-tone/14 text-tone", toneClass[categoryTone(category)])}>{t(`categories.${category}`)}</Badge>
        )}
        {versions.map((version) => (
          <Badge key={version} variant="secondary" className="font-mono">
            {version}
          </Badge>
        ))}
        {hit.versions.length > VISIBLE_VERSIONS && (
          <Badge variant="secondary">{t("catalog.moreVersions", hit.versions.length - VISIBLE_VERSIONS)}</Badge>
        )}
      </div>

      <div className="mt-auto flex gap-1.5 pt-1">
        {installed ? (
          <Badge variant="success" className="h-ctl flex-1 justify-center">
            <Check />
            {t("catalog.installed")}
          </Badge>
        ) : !onInstall ? (
          <span className="flex-1" />
        ) : serverSide ? (
          <Button className="flex-1" onClick={onInstall}>
            <Download />
            {t("catalog.install")}
          </Button>
        ) : (
          <Button variant="outline" className="flex-1" disabled title={tk("unsupported")}>
            {t("catalog.clientOnly")}
          </Button>
        )}
        <Button variant="outline" size="icon" title={t("catalog.details")} aria-label={t("catalog.details")} onClick={onDetails}>
          <Info />
        </Button>
      </div>
    </article>
  );
}
