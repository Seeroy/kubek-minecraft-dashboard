"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { toneClass } from "@/shared/ui/tone";
import type { CatalogSource } from "@shared/types/catalog.types";
import { BadgeCheck, Users } from "lucide-react";
import type { CatalogMark } from "../lib/catalog";

export function SourceBadge({ source }: { source: CatalogSource }) {
  const { t } = useTranslation("modules.catalog");
  const Icon = source === "official" ? BadgeCheck : Users;
  return (
    <Badge className={cn("shrink-0 bg-tone/12 text-tone", toneClass[source === "official" ? "primary" : "orange"])} title={t(`sources.${source}Hint`)}>
      <Icon />
      {t(`sources.${source}`)}
    </Badge>
  );
}

export function MarkBadge({ mark, className }: { mark: CatalogMark; className?: string }) {
  const Icon = mark.icon;
  const content = (
    <>
      {Icon && <Icon />}
      <span className="truncate">{mark.label}</span>
    </>
  );
  if (mark.warning)
    return (
      <Badge variant="warning" className={className} title={mark.title ?? mark.label}>
        {content}
      </Badge>
    );
  return (
    <Badge className={cn("bg-tone/12 text-tone", toneClass[mark.tone ?? "gray"], className)} title={mark.title ?? mark.label}>
      {content}
    </Badge>
  );
}
