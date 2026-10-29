"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { type AccessMap, mergeAccess } from "@shared/access/areas";
import { Crown } from "lucide-react";
import { AREA_ICONS, grantedAreas, useAccessLabels } from "../../data/access-areas";
import type { InheritedRole } from "./AccessMatrix";

interface AccessSummaryProps {
  roles: InheritedRole[];
  grants: AccessMap;
  ext: string[];
  isAdmin?: boolean;
  className?: string;
}

/** What the account ends up with: highest level per area over roles and own rights */
export function AccessSummary({ roles, grants, ext, isAdmin, className }: AccessSummaryProps) {
  const { t } = useTranslation("modules.settings.userForm");
  const labels = useAccessLabels();
  const levels = grantedAreas(mergeAccess(...roles.map((role) => role.grants), grants));
  const extCount = new Set([...roles.flatMap((role) => role.ext), ...ext]).size;

  if (isAdmin) {
    return (
      <p className={cn("flex items-center gap-2 text-[12.5px] text-muted-foreground", className)}>
        <Crown className="size-3.5 text-warn" />
        {t("summaryAdmin")}
      </p>
    );
  }
  if (!levels.length && !extCount) return <p className={cn("text-[12.5px] text-muted-foreground", className)}>{t("summaryEmpty")}</p>;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {levels.map(([area, level]) => {
        const Icon = AREA_ICONS[area];
        return (
          <li key={area} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card pr-2 pl-1.5 text-[12px]">
            <Icon className="size-3.5 text-primary" />
            <span className="font-medium">{labels.area(area)}</span>
            <span className="text-muted-foreground">{labels.level(level)}</span>
          </li>
        );
      })}
      {extCount > 0 && (
        <li className="inline-flex h-6 items-center rounded-md border border-border bg-card px-2 text-[12px] text-muted-foreground">
          {t("extCount", extCount)}
        </li>
      )}
    </ul>
  );
}
