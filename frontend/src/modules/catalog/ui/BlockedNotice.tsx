"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Plate } from "@/shared/ui/plate";
import type { CatalogBlocked } from "@shared/types/catalog.types";
import { OctagonAlert } from "lucide-react";

interface BlockedNoticeProps {
  blocked: CatalogBlocked[] | undefined;
  /** Installed ids with their display names */
  installed: Map<string, string>;
}

/** Installed packages the catalog pulled, so people who already have them find out */
export function BlockedNotice({ blocked, installed }: BlockedNoticeProps) {
  const { t } = useTranslation("modules.catalog.blocked");
  const hits = (blocked ?? []).filter((b) => installed.has(b.id));
  if (!hits.length) return null;

  return (
    <div className="tone-red grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-tone/30 bg-tone/9 px-4 py-3 text-[13px]">
      <Plate tone="red">
        <OctagonAlert />
      </Plate>
      <div className="grid gap-1">
        <b className="font-semibold">{t("title", hits.length)}</b>
        <ul className="grid gap-0.5 text-muted-foreground">
          {hits.map((b) => (
            <li key={b.id}>
              <span className="font-medium text-foreground">{installed.get(b.id)}</span> <span className="font-mono text-xs">({b.id})</span>: {b.reason}
            </li>
          ))}
        </ul>
        <span className="text-muted-foreground">{t("hint")}</span>
      </div>
    </div>
  );
}
