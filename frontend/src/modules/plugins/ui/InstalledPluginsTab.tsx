"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { InstalledPluginView } from "@shared/types/plugins";
import { Loader2 } from "lucide-react";
import { InstalledPluginsTable } from "./InstalledPluginsTable";

interface InstalledPluginsTabProps {
  installed: InstalledPluginView[];
  isInstalledLoading: boolean;
  installedDependencies: Set<string>;
  onUpdate: (plugin: InstalledPluginView) => void;
  onRemove: (plugin: InstalledPluginView) => void;
}

export const InstalledPluginsTab = ({
  installed,
  isInstalledLoading,
  installedDependencies,
  onUpdate,
  onRemove,
}: InstalledPluginsTabProps) => {
  const { t } = useTranslation("modules.plugins.installedTab");

  if (isInstalledLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (installed.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-muted-foreground">
        <p className="font-medium">{t("emptyTitle")}</p>
        <p className="text-sm">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <InstalledPluginsTable
      installed={installed}
      installedDependencies={installedDependencies}
      onUpdate={onUpdate}
      onRemove={onRemove}
    />
  );
};
