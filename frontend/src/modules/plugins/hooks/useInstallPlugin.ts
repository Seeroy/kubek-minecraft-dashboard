import { contentApi, type ContentKind } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ModrinthProject, ModrinthVersion } from "@shared/types/plugins";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getContentKind } from "../content-kind";
import {
  getInstallableDependencies,
  getMissingDependencies,
} from "../utils/resolveDependencies";

interface UseInstallPluginParams {
  isOpen: boolean;
  kind?: ContentKind;
  serverId?: string;
  projectId?: string;
  initialVersionId?: string;
  pluginRecordId?: string;
  mode: "install" | "update";
  onClose: () => void;
  onComplete?: () => void;
}

export function useInstallPlugin({
  isOpen,
  kind = "plugin",
  serverId,
  projectId,
  initialVersionId,
  pluginRecordId,
  mode,
  onClose,
  onComplete,
}: UseInstallPluginParams) {
  const api = contentApi(kind);
  const config = getContentKind(kind);
  const [project, setProject] = useState<ModrinthProject | null>(null);
  const [versions, setVersions] = useState<ModrinthVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<
    string | undefined
  >(initialVersionId);
  const [autoInstallDeps, setAutoInstallDeps] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const { notify } = useNotifications();
  const { t } = useTranslation(`${config.i18nNs}.modals.install`);

  useEffect(() => {
    if (!isOpen) return;
    if (!projectId) {
      setProject(null);
      setVersions([]);
      return;
    }

    setIsLoading(true);
    api
      .getProject(projectId)
      .then((projectResponse) => {
        setProject(projectResponse);
        if (!selectedVersionId) {
          setSelectedVersionId(
            initialVersionId || projectResponse.versions?.[0]
          );
        }
      })
      .catch((error: any) => {
        notify({
          title: error?.message || t("notifications.loadProjectFailed"),
          type: "error",
        });
        setProject(null);
        setVersions([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, projectId, initialVersionId]);

  // Lazy load versions when needed
  const loadVersions = useCallback(async () => {
    if (!projectId || versions.length > 0 || versionsLoading) return;

    setVersionsLoading(true);
    try {
      const versionsResponse = await api.getProjectVersions(projectId);
      setVersions(versionsResponse);
      // Only set version if none is selected yet
      setSelectedVersionId((current) => {
        if (!current && versionsResponse.length > 0) {
          return initialVersionId || versionsResponse[0]?.id;
        }
        return current;
      });
    } catch (error: any) {
      notify({
        title: error?.message || t("notifications.loadVersionsFailed"),
        type: "error",
      });
    } finally {
      setVersionsLoading(false);
    }
  }, [projectId, versions.length, versionsLoading, initialVersionId]);

  // Load versions as soon as the project is ready
  useEffect(() => {
    if (isOpen && project) {
      void loadVersions();
    }
  }, [isOpen, project, loadVersions]);

  useEffect(() => {
    if (!isOpen) {
      setProject(null);
      setVersions([]);
      setIsSubmitting(false);
      setIsLoading(false);
      setVersionsLoading(false);
    }
  }, [isOpen]);

  const currentVersion = useMemo(() => {
    if (!selectedVersionId || versions.length === 0) return undefined;
    return versions.find((version) => version.id === selectedVersionId);
  }, [versions, selectedVersionId]);

  const installableDependencies = useMemo(
    () => getInstallableDependencies(currentVersion),
    [currentVersion]
  );

  const missingDependencies = useMemo(
    () => getMissingDependencies(currentVersion),
    [currentVersion]
  );

  const handleSubmit = async () => {
    if (!serverId || !projectId || !selectedVersionId) {
      notify({ title: t("notifications.missingServer"), type: "error" });
      return;
    }

    if (mode === "update" && !pluginRecordId) {
      notify({ title: t("notifications.missingIdentifier"), type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const dependenciesPayload = autoInstallDeps
        ? installableDependencies
        : [];

      if (mode === "update" && pluginRecordId) {
        await api.update(serverId, pluginRecordId, {
          versionId: selectedVersionId,
          dependencies: dependenciesPayload,
          reinstall: autoInstallDeps,
        });
        notify({ title: t("notifications.updateScheduled"), type: "success" });
      } else {
        await api.install({
          serverId,
          projectId,
          versionId: selectedVersionId,
          dependencies: dependenciesPayload,
          installDependencies: autoInstallDeps,
        });
        notify({
          title: t("notifications.installationScheduled"),
          type: "success",
        });
      }

      onComplete?.();
      onClose();
    } catch (error: any) {
      notify({
        title: error?.message || t("notifications.startFailed"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
