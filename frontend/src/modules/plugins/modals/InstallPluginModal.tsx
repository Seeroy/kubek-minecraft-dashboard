"use client";

import type { ContentKind } from "@/api";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { DownloadCloud, ExternalLink, Loader2, Puzzle } from "lucide-react";
import { getContentKind } from "../content-kind";
import { useInstallPlugin } from "../hooks/useInstallPlugin";
import { ChangelogPanel } from "../ui/ChangelogPanel";
import { CompatibilityCard } from "../ui/CompatibilityCard";
import { DependenciesCard } from "../ui/DependenciesCard";
import { MissingDependenciesWarning } from "../ui/MissingDependenciesWarning";
import { VersionSelect } from "../ui/VersionSelect";

interface InstallPluginModalProps extends ModalProps {
  kind?: ContentKind;
  serverId?: string;
  projectId?: string;
  initialVersionId?: string;
  pluginRecordId?: string;
  mode?: "install" | "update";
  onComplete?: () => void;
}

function InstallPluginModalComponent({
  isOpen,
  onClose,
  kind = "plugin",
  serverId,
  projectId,
  initialVersionId,
  pluginRecordId,
  mode = "install",
  onComplete,
}: InstallPluginModalProps) {
  const config = getContentKind(kind);
  const { t } = useTranslation(`${config.i18nNs}.modals.install`);
  const {
    project,
    versions,
    isLoading,
    isSubmitting,
    selectedVersionId,
    setSelectedVersionId,
    autoInstallDeps,
    setAutoInstallDeps,
    versionsLoading,
    loadVersions,
    currentVersion,
    installableDependencies,
    missingDependencies,
    handleSubmit,
  } = useInstallPlugin({
    isOpen,
    kind,
    serverId,
    projectId,
    initialVersionId,
    pluginRecordId,
    mode,
    onClose,
    onComplete,
  });

  const modeKey = mode === "update" ? "update" : "install";
  const dialogTitle = t(`title.${modeKey}`);
  const actionLabel = t(`actionLabel.${modeKey}`);
  const submittingLabel =
    mode === "update" ? t("buttons.updating") : t("buttons.installing");

  const versionLabel =
    currentVersion?.version_number ??
    (versionsLoading
      ? t("description.loadingVersionsFallback")
      : t("description.selectVersionFallback"));
  const descriptionText = project
    ? t("description.resolving", project.title, versionLabel)
    : t("description.default");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] w-2xl max-w-xl! flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              {mode === "update" ? (
                <DownloadCloud className="h-5 w-5 text-primary" />
              ) : (
                <Puzzle className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{descriptionText}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
            <p className="font-medium">{t("states.loadingDetails")}</p>
          </div>
        ) : project ? (
          <div className="flex-1 space-y-4 overflow-hidden py-2">
            <VersionSelect
              versions={versions}
              selectedVersionId={selectedVersionId}
              onSelectVersion={setSelectedVersionId}
              versionsLoading={versionsLoading}
              isSubmitting={isSubmitting}
              onLoadVersions={loadVersions}
              t={t}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {currentVersion && (
                <CompatibilityCard version={currentVersion} t={t} />
              )}

              <DependenciesCard
                installableDependencies={installableDependencies}
                autoInstallDeps={autoInstallDeps}
                onAutoInstallDepsChange={setAutoInstallDeps}
                isSubmitting={isSubmitting}
                t={t}
              />
            </div>

            {missingDependencies.length > 0 && (
              <MissingDependenciesWarning
                missingDependencies={missingDependencies}
                t={t}
              />
            )}

            {currentVersion?.changelog && (
              <ChangelogPanel changelog={currentVersion.changelog} t={t} />
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <Puzzle className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="font-medium">{t("states.noSelectionTitle")}</p>
              <p className="text-sm">{t("states.noSelectionDescription")}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-shrink-0 flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {project && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              render={
                <a
                  href={`https://modrinth.com/${config.modrinthType}/${project.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1"
                />
              }
            >
              <ExternalLink className="h-3 w-3" />
              {t("buttons.viewModrinth")}
            </Button>
          )}
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="sm:flex-none"
            >
              {t("buttons.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                versionsLoading ||
                !serverId ||
                !project ||
                !currentVersion ||
                !selectedVersionId
              }
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {submittingLabel}
                </>
              ) : (
                <>
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  {actionLabel}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const INSTALL_PLUGIN_MODAL_ID = "plugins/install";

export function InstallPluginModalRegistration() {
  useThisModal({
    id: INSTALL_PLUGIN_MODAL_ID,
    component: InstallPluginModalComponent,
    module: "plugins",
  });

  return null;
}
