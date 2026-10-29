import { getSafeServerPath } from "@/core/utils/serverPath";
import { ServerModsRepository } from "@/modules/database/repositories/server-mods.repository";
import { requiredDependencies } from "@/modules/modrinth/modrinth-mappers";
import { ModsService } from "@/modules/mods/mods.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable } from "@nestjs/common";
import type {
  ModrinthVersion,
  PluginInstallDependencyInput,
} from "@shared/types/plugins";
import type { IServer } from "@shared/types/server/server.types";
import { TaskStatus } from "@shared/types/task.types";
import { promises as fs } from "fs";
import { FABRIC_PROXY_PROJECT } from "./fabric.forwarding";

const JAR = /fabricproxy-lite/i;

/** Puts FabricProxy-Lite on a Fabric server through the regular mods engine */
@Injectable()
export class FabricProxyInstaller {
  constructor(
    private readonly mods: ModsService,
    private readonly records: ServerModsRepository,
    private readonly tasks: TasksService,
  ) {}

  async isInstalled(serverId: string): Promise<boolean> {
    const project = await this.mods.getProject(FABRIC_PROXY_PROJECT);
    const managed = this.records
      .findByServer(serverId)
      .some((record) => record.projectId === project.id);
    return managed || (await this.hasJar(serverId));
  }

  async ensure(
    server: IServer,
    gameVersion: string | undefined,
    userId: string,
  ) {
    if (await this.isInstalled(server.id)) return;

    const project = await this.mods.getProject(FABRIC_PROXY_PROJECT);
    const [version] = await this.mods.getProjectVersions(project.id, {
      gameVersion,
    });
    if (!version) {
      throw new Error(
        `FabricProxy-Lite has no build for ${gameVersion ?? "this version"}`,
      );
    }

    const { taskId } = await this.mods.installPlugin(userId, {
      serverId: server.id,
      projectId: project.id,
      versionId: version.id,
      dependencies: await this.dependencies(server.id, version, gameVersion),
    });
    const task = await this.tasks.waitFor(taskId);
    if (task.status !== TaskStatus.SUCCESS) {
      throw new Error(task.error?.message ?? "FabricProxy-Lite install failed");
    }
  }

  // The engine would take the newest Fabric API of any game version, pick
  // builds for this server and skip what it already manages
  private async dependencies(
    serverId: string,
    version: ModrinthVersion,
    gameVersion: string | undefined,
  ): Promise<PluginInstallDependencyInput[]> {
    const managed = new Set(
      this.records.findByServer(serverId).map((record) => record.projectId),
    );
    const out: PluginInstallDependencyInput[] = [];
    for (const dep of requiredDependencies(version)) {
      if (managed.has(dep.projectId)) continue;
      const versionId =
        dep.versionId ??
        (await this.mods.getProjectVersions(dep.projectId, { gameVersion }))[0]
          ?.id;
      if (!versionId) {
        throw new Error(`No ${dep.projectId} build for ${gameVersion}`);
      }
      out.push({ projectId: dep.projectId, versionId });
    }
    return out;
  }

  private async hasJar(serverId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(getSafeServerPath(serverId, "mods"));
      return files.some((file) => JAR.test(file));
    } catch {
      return false;
    }
  }
}
