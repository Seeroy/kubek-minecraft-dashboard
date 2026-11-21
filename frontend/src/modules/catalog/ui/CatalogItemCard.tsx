"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Button } from "@/shared/ui/button";
import { GithubMark } from "@/shared/ui/GithubMark";
import { toneClass } from "@/shared/ui/tone";
import { Clock, GitCommitHorizontal, Scale, User, type LucideIcon } from "lucide-react";
import { type CatalogEntry, type CatalogMark, sourceUrl } from "../lib/catalog";
import { CatalogAction } from "./CatalogAction";
import { CatalogIcon } from "./CatalogIcon";
import { MarkBadge, SourceBadge } from "./CatalogBadges";

interface CatalogItemCardProps {
  item: CatalogEntry;
  marks: CatalogMark[];
  icon: LucideIcon;
  installing: boolean;
  onInstall?: () => void;
  onOpen: () => void;
}

export function CatalogItemCard({ item, marks, icon, installing, onInstall, onOpen }: CatalogItemCardProps) {
  const { t } = useTranslation("modules.catalog");
  const updated = item.updatedAt ? formatRelative(new Date(item.updatedAt).getTime(), t("justNow")) : null;

  return (
    <article
      // Links and buttons inside keep their own action
      onClick={(event) => !(event.target as HTMLElement).closest("a, button") && onOpen()}
      className={cn(
        "flex cursor-pointer flex-col gap-2.5 rounded-lg border border-border bg-card p-4 transition-[border-color,translate,box-shadow] duration-200 ease-smooth hover:-translate-y-0.5 hover:border-foreground/18 hover:shadow-lg",
        item.updateAvailable && "border-primary/40"
      )}
    >
      <div className="flex items-center gap-3">
        <CatalogIcon item={item} fallback={icon} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold">
            <button type="button" onClick={onOpen} className="max-w-full cursor-pointer truncate text-left outline-none hover:underline focus-visible:underline">
              {item.name}
            </button>
          </h3>
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <User className="size-3 shrink-0" />
            {item.authorUrl ? (
              <a href={item.authorUrl} target="_blank" rel="noreferrer" className="truncate hover:text-foreground hover:underline">
                {item.author}
              </a>
            ) : (
              <span className="truncate">{item.author}</span>
            )}
          </span>
        </div>
        <SourceBadge source={item.source} />
      </div>

      <p className="line-clamp-2 min-h-[37px] text-[12.5px] leading-normal text-muted-foreground">{item.description}</p>

      {/* One line, a long relative date truncates instead of wrapping */}
      <div className="flex min-w-0 gap-3.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums [&_svg]:size-3.5 [&_svg]:shrink-0">
        <span className="font-mono">
          v{item.version}
          {item.updateAvailable && item.installedVersion && <span className="text-primary"> {t("fromVersion", item.installedVersion)}</span>}
        </span>
        {item.commit && (
          <a
            href={`https://github.com/${item.repo}/tree/${item.commit}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono hover:text-foreground"
            title={t("commitHint")}
          >
            <GitCommitHorizontal />
            {item.commit.slice(0, 7)}
          </a>
        )}
        {item.license && (
          <span className="inline-flex items-center gap-1" title={t("license")}>
            <Scale />
            {item.license}
          </span>
        )}
        {updated && (
          <span className="inline-flex min-w-0 items-center gap-1" title={t("updatedAt", updated)}>
            <Clock />
            <span className="truncate">{updated}</span>
          </span>
        )}
      </div>

      {marks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {marks.map((mark) => (
            <MarkBadge key={mark.key} mark={mark} />
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-1.5 pt-1">
        <CatalogAction item={item} installing={installing} onInstall={onInstall} />
        <Button
          variant="outline"
          size="icon"
          className={toneClass.gray}
          title={t("source")}
          aria-label={t("source")}
          nativeButton={false}
          render={<a href={sourceUrl(item)} target="_blank" rel="noreferrer" />}
        >
          <GithubMark className="size-4" />
        </Button>
      </div>
    </article>
  );
}
