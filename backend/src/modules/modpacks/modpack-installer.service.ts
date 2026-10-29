import { progressThrottle } from "@/core/utils/download";
import { runPool } from "@/core/utils/run-pool";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { ServerModpacksRepository } from "@/modules/database/repositories/server-modpacks.repository";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable } from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";
import { TaskSteps } from "@shared/types/task.types";
import { existsSync, promises as fs } from "fs";
import { join } from "path";
import { ModpackContentRegistrar } from "./modpack-content-registrar.service";
import type { StagedPack } from "./modpack-staging.service";
import { extractOverrideLayer } from "./mrpack/mrpack-archive";
import { downloadVerified } from "./mrpack/mrpack-download";
import { jailPath } from "./mrpack/mrpack-paths";
import type { MrpackFile } from "./mrpack/mrpack-reader";
import { restorePanelProperties } from "./mrpack/panel-properties";

const PARALLEL_DOWNLOADS = 4;
const PROGRESS_INTERVAL_MS = 250;

/**
 * Pack-specific provisioning that runs after the Fabric base install:
 * files, overrides, managed content and the pack origin
 */
@Injectable()
export class ModpackInstaller {
  constructor(
    private readonly tasks: TasksService,
    private readonly registrar: ModpackContentRegistrar,
    private readonly origins: ServerModpacksRepository,
  ) {}

  async apply(pack: StagedPack, server: IServer, taskId: string) {
    const dir = getSafeServerPath(server.id);

    await this.downloadFiles(pack.manifest.files, dir, taskId);
    await this.applyOverrides(pack.archivePath, dir, taskId);

    this.tasks.updateTask(taskId, {
      step: TaskSteps.REGISTERING_CONTENT,
      progress: 0,
      message: undefined,
    });
    await this.registrar.register(server.id);
    this.origins.save({
      serverId: server.id,
      source: pack.source,
      projectId: pack.projectId,
      versionId: pack.versionId,
      name: pack.manifest.name,
      version: pack.manifest.versionId,
      installedAt: Date.now(),
    });
    this.tasks.updateTask(taskId, { progress: 100 });
  }

  private async downloadFiles(
    files: MrpackFile[],
    dir: string,
    taskId: string,
  ): Promise<void> {
    const total = files.reduce((sum, file) => sum + file.size, 0) || 1;
    let bytes = 0;
    let done = 0;
    const ready = progressThrottle(PROGRESS_INTERVAL_MS);
    const report = (force = false) => {
      if (!ready(force)) return;
      this.tasks.updateTask(taskId, {
        step: TaskSteps.DOWNLOADING_MODS,
        progress: Math.min(100, Math.round((bytes / total) * 100)),
        message: `${done}/${files.length}`,
      });
    };

    report(true);
    await runPool(files, PARALLEL_DOWNLOADS, async (file) => {
      await downloadVerified(file, jailPath(dir, file.path), (delta) => {
        bytes += delta;
        report();
      });
      done++;
      report(done === files.length);
    });
  }

  private async applyOverrides(
    archivePath: string,
    dir: string,
    taskId: string,
  ): Promise<void> {
    this.tasks.updateTask(taskId, {
      step: TaskSteps.APPLYING_OVERRIDES,
      progress: 0,
      message: undefined,
    });

    const propertiesPath = join(dir, "server.properties");
    const original = existsSync(propertiesPath)
      ? await fs.readFile(propertiesPath, "utf8")
      : undefined;

    await extractOverrideLayer(archivePath, dir, "overrides");
    this.tasks.updateTask(taskId, { progress: 50 });
    await extractOverrideLayer(archivePath, dir, "server-overrides");

    if (original !== undefined && existsSync(propertiesPath)) {
      const current = await fs.readFile(propertiesPath, "utf8");
      if (current !== original) {
        await fs.writeFile(
          propertiesPath,
          restorePanelProperties(current, original),
        );
      }
    }
    this.tasks.updateTask(taskId, { progress: 100 });
  }
}
