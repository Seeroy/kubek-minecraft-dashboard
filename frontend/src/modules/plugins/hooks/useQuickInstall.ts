"use client";
import { api, contentApi, type ContentKind, type InstallContentPayload } from "@/api";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useInstallContentMutation } from "@/shared/queries";
import { qk } from "@/shared/queries/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { installKey, useInstallQueue } from "../stores/install-queue";
import { pickVersion } from "../utils/pickVersion";
import { getInstallableDependencies } from "../utils/resolveDependencies";

const POLL_MS = 1500;
const VERSIONS_STALE_MS = 5 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTask(taskId: string) {
  for (;;) {
    await sleep(POLL_MS);
    try {
      const { status } = await api.tasks.getOne(taskId);
      if (status !== "pending" && status !== "running") return;
    } catch {
      // task is gone, nothing left to wait for
      return;
    }
  }
}

/** Installs straight from the catalog, keeps the project marked as installing until its task ends */
export function useQuickInstall(kind: ContentKind, server: Server) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.content.install");
  const install = useInstallContentMutation(kind, server.id);
  const queued = useInstallQueue((state) => state.keys);
  const add = useInstallQueue((state) => state.add);
  const remove = useInstallQueue((state) => state.remove);
  const keys = kind === "mod" ? qk.mods : qk.plugins;
  const gameVersion = server.variables?.GAME_VERSION != null ? String(server.variables.GAME_VERSION) : undefined;

  const resolve = async (projectId: string): Promise<InstallContentPayload | undefined> => {
    const versions = await queryClient.fetchQuery({
      queryKey: keys.versions(projectId),
      queryFn: () => contentApi(kind).getProjectVersions(projectId),
      staleTime: VERSIONS_STALE_MS,
    });
    const versionId = pickVersion(versions, undefined, gameVersion);
    const version = versions.find((v) => v.id === versionId);
    if (!version) {
      notify({ type: "error", title: t("noVersions") });
      return;
    }
    return {
      serverId: server.id,
      projectId,
      versionId: version.id,
      dependencies: getInstallableDependencies(version),
      installDependencies: true,
    };
  };

  // Runs to the end even if the catalog unmounts, so the queue never gets stuck
  const run = async (projectId: string, payload?: InstallContentPayload) => {
    try {
      const body = payload ?? (await resolve(projectId));
      if (!body) return;
      const { taskId } = await install.mutateAsync(body);
      await waitForTask(taskId);
      await queryClient.invalidateQueries({ queryKey: keys.installed(server.id) });
    } catch {
      // the query client already toasts request errors
    } finally {
      remove(installKey(kind, server.id, projectId));
    }
  };

  const installOne = (projectId: string, payload?: InstallContentPayload) => {
    add([installKey(kind, server.id, projectId)]);
    void run(projectId, payload);
  };

  // One at a time, so plugins sharing a dependency don't download it twice
  const installMany = async (projectIds: string[]) => {
    add(projectIds.map((id) => installKey(kind, server.id, id)));
    for (const id of projectIds) await run(id);
  };

  const isInstalling = (projectId: string) => !!queued[installKey(kind, server.id, projectId)];

  return { installOne, installMany, isInstalling };
}
