"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { ArrowUpCircle, Check, Download, Lock, TriangleAlert } from "lucide-react";
import type { CatalogEntry } from "../lib/catalog";

interface CatalogActionProps {
  item: CatalogEntry;
  installing: boolean;
  /** Missing when the user may not install */
  onInstall?: () => void;
  compact?: boolean;
}

/** Install, update or the reason it can't be done, shared by cards and rows */
export function CatalogAction({ item, installing, onInstall, compact }: CatalogActionProps) {
  const { t } = useTranslation("modules.catalog");
  const wide = !compact && "h-ctl flex-1 justify-center";

  if (item.builtIn)
    return (
      <Badge variant="secondary" className={cn(wide)} title={t("action.builtInHint")}>
        <Lock />
        {t("action.builtIn")}
      </Badge>
    );
  if (installing)
    return (
      <Button className={cn(!compact && "flex-1")} size={compact ? "sm" : "default"} disabled>
        <Spinner />
        {item.installedVersion ? t("action.updating") : t("action.installing")}
      </Button>
    );
  if (item.installedVersion && !item.updateAvailable)
    return (
      <Badge variant="success" className={cn(wide)}>
        <Check />
        {t("action.installed")}
      </Badge>
    );
  if (!item.compatible)
    return (
      <Badge variant="warning" className={cn(wide)} title={t("action.incompatibleHint", item.engines.kubek)}>
        <TriangleAlert />
        {t("action.incompatible")}
      </Badge>
    );
  if (!onInstall) return compact ? null : <span className="flex-1" />;
  if (item.updateAvailable)
    return (
      <Button className={cn(!compact && "flex-1")} size={compact ? "sm" : "default"} onClick={onInstall}>
        <ArrowUpCircle />
        {t("action.update", item.version)}
      </Button>
    );
  return (
    <Button className={cn(!compact && "flex-1")} size={compact ? "sm" : "default"} variant={compact ? "outline" : "default"} onClick={onInstall}>
      <Download />
      {t("action.install")}
    </Button>
  );
}
