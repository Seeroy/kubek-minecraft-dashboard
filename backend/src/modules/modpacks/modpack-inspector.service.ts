import { getErrorMessage } from "@/core/utils/error";
import { ModrinthClient } from "@/modules/modrinth/modrinth-client.service";
import { TaskStageTracker } from "@/modules/tasks/task-stages";
import { TasksService } from "@/modules/tasks/tasks.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ModpackErrorCode,
  type ModpackPreview,
  type ModpackWarning,
} from "@shared/types/modpack.types";
import { type ITask, TaskType } from "@shared/types/task.types";
import { promises as fs } from "fs";
import { join } from "path";
import {
  ModpackStagingService,
  type StagedPack,
  type StagedPackMeta,
} from "./modpack-staging.service";
import { scanPackArchive } from "./mrpack/mrpack-archive";
import { downloadVerified } from "./mrpack/mrpack-download";
import { MrpackError } from "./mrpack/mrpack-error";
import { MrpackReader } from "./mrpack/mrpack-reader";

const ARCHIVE_NAME = "pack.mrpack";
const MAX_PACK_SIZE = 1024 * 1024 * 1024;
const DOWNLOAD_STAGE = "download";
const READ_STAGE = "read";

/**
 * Turns an uploaded or Modrinth-hosted .mrpack into a staged pack and the
 * preview the user confirms before anything is installed
 */
@Injectable()
export class ModpackInspector {
  constructor(
    private readonly staging: ModpackStagingService,
    private readonly modrinth: ModrinthClient,
    private readonly tasks: TasksService,
  ) {}

  async inspectUpload(
    ownerId: string,
    uploadPath: string,
  ): Promise<ModpackPreview> {
    const slot = await this.staging.allocate();
    const archivePath = join(slot.dir, ARCHIVE_NAME);
    try {
      await fs.rename(uploadPath, archivePath);
      return await this.stage(slot, ownerId, archivePath, { source: "file" });
    } catch (error) {
      await fs.rm(uploadPath, { force: true });
      await this.staging.discard(slot);
      throw toHttp(error);
    }
  }

  /** Downloads in the background, the task result is the preview */
  inspectModrinthTask(
    ownerId: string,
    projectId: string,
    versionId: string,
  ): ITask {
    return this.tasks.runTask(TaskType.MODPACK_INSPECT, ownerId, (taskId) => {
      const stages = new TaskStageTracker(this.tasks, taskId, [
        { key: DOWNLOAD_STAGE, kind: "downloadPack", weight: 9 },
        { key: READ_STAGE, kind: "readPack" },
      ]);
      return this.inspectModrinth(ownerId, projectId, versionId, stages).catch(
        (error: unknown) => {
          stages.failRunning();
          throw error;
        },
      );
    });
  }

  private async inspectModrinth(
    ownerId: string,
    projectId: string,
    versionId: string,
    stages: TaskStageTracker,
  ): Promise<ModpackPreview> {
    const [project, version] = await Promise.all([
      this.modrinth.getProject(projectId),
      this.modrinth.getVersion(versionId),
    ]);
    if (
      project.project_type !== "modpack" ||
      version.project_id !== project.id
    ) {
      throw invalidRequest("This version is not part of a modpack project");
    }
    const file =
      version.files.find((f) => f.primary && f.filename.endsWith(".mrpack")) ??
      version.files.find((f) => f.filename.endsWith(".mrpack"));
    if (!file?.hashes.sha1 || !file.hashes.sha512) {
      throw invalidRequest("This version has no .mrpack file");
    }

    const slot = await this.staging.allocate();
    const archivePath = join(slot.dir, ARCHIVE_NAME);
    const total = file.size ?? 0;
    let received = 0;
    stages.start(DOWNLOAD_STAGE, {
      name: file.filename,
      bytes: { done: 0, total },
    });
    try {
      await downloadVerified(
        {
          path: file.filename,
          sha1: file.hashes.sha1,
          sha512: file.hashes.sha512,
          size: file.size ?? MAX_PACK_SIZE,
          downloads: [file.url],
        },
        archivePath,
        (bytes) => {
          received += bytes;
          stages.update(DOWNLOAD_STAGE, {
            bytes: { done: received, total },
            progress: total
              ? Math.min(99, Math.floor((received / total) * 100))
              : 0,
          });
        },
      ).catch((error: unknown) => {
        throw new MrpackError(
          ModpackErrorCode.INVALID,
          `Failed to download the pack: ${getErrorMessage(error)}`,
        );
      });
      stages.done(DOWNLOAD_STAGE);
      stages.start(READ_STAGE);
      const preview = await this.stage(slot, ownerId, archivePath, {
        source: "modrinth",
        projectId: project.id,
        versionId: version.id,
        iconUrl: project.icon_url,
      });
      stages.done(READ_STAGE);
      return preview;
    } catch (error) {
      await this.staging.discard(slot);
      throw toHttp(error);
    }
  }

  private async stage(
    slot: { id: string; dir: string },
    ownerId: string,
    archivePath: string,
    meta: Omit<StagedPackMeta, "hasClientOverrides">,
  ): Promise<ModpackPreview> {
    const scan = await scanPackArchive(archivePath);
    const manifest = MrpackReader.parseIndex(scan.index);
    const pack = this.staging.add(slot, ownerId, archivePath, manifest, {
      ...meta,
      hasClientOverrides: scan.hasClientOverrides,
    });
    return toPreview(pack);
  }
}

export function toPreview(pack: StagedPack): ModpackPreview {
  const { manifest } = pack;
  const warnings: ModpackWarning[] = [...manifest.warnings];
  if (pack.hasClientOverrides)
    warnings.push({ code: "client_overrides_ignored" });

  return {
    packId: pack.id,
    source: pack.source,
    projectId: pack.projectId,
    versionId: pack.versionId,
    iconUrl: pack.iconUrl,
    name: manifest.name,
    version: manifest.versionId,
    summary: manifest.summary,
    minecraftVersion: manifest.minecraftVersion,
    loader: manifest.loader,
    loaderVersion: manifest.loaderVersion,
    fileCount: manifest.files.length,
    modCount: manifest.files.filter(
      (f) => f.path.startsWith("mods/") && f.path.endsWith(".jar"),
    ).length,
    downloadSize: manifest.files.reduce((sum, f) => sum + f.size, 0),
    skippedClientOnly: manifest.skippedClientOnly,
    warnings,
  };
}

function invalidRequest(message: string): BadRequestException {
  return new BadRequestException({ code: ModpackErrorCode.INVALID, message });
}

function toHttp(error: unknown): unknown {
  if (error instanceof MrpackError) {
    return new BadRequestException({
      code: error.code,
      message: error.message,
    });
  }
  return error;
}
