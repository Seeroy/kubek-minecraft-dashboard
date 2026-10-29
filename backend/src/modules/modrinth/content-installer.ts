import {
  download,
  DownloadError,
  progressThrottle,
} from "@/core/utils/download";
import { getErrorCode } from "@/core/utils/error";
import { digestAlgorithm } from "@/core/utils/hashFile";
import {
  getRealServerPath,
  getServerContentPath,
} from "@/core/utils/serverPath";
import { IServerPluginsRepository } from "@/modules/database/repositories/server-plugins.repository";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import type {
  ModrinthProject,
  ModrinthVersion,
  ServerPluginRecord,
} from "@shared/types/plugins";
import { existsSync, promises as fs } from "fs";
import { pickPrimaryFile } from "./modrinth-mappers";

const PROGRESS_INTERVAL_MS = 200;

export interface InstallContext {
  project: ModrinthProject;
  version: ModrinthVersion;
}

export interface InstallSingleOptions {
  taskId: string;
  serverId: string;
  context: InstallContext;
  dependencyOf?: string;
  suppressProgress?: boolean;
  existingRecordOverride?: ServerPluginRecord;
}

/**
 * Downloads a Modrinth version file into a server content folder, verifies
 * it and keeps the managed content record in sync
 */
export class ContentInstaller {
  constructor(
    private readonly folder: string,
    private readonly repository: IServerPluginsRepository,
    private readonly tasks: TasksService,
  ) {}

  async installSingle(
    options: InstallSingleOptions,
  ): Promise<ServerPluginRecord> {
    const { taskId, serverId, context, suppressProgress } = options;
    const { project, version } = context;
    const report = (progress: number, message: string) => {
      if (!suppressProgress)
        this.tasks.updateTask(taskId, { progress, message });
    };

    const existing =
      options.existingRecordOverride ??
      this.repository.findByServerAndProject(serverId, project.id);
    if (existing && existing.versionId === version.id) {
      report(100, `${project.title} is already up to date`);
      return existing;
    }

    const file = pickPrimaryFile(version);
    if (!file?.url) {
      throw new BadRequestException(
        `Version ${version.id} does not provide downloadable files`,
      );
    }

    const targetPath = getServerContentPath(
      serverId,
      this.folder,
      file.filename,
    );
    const tempPath = getServerContentPath(
      serverId,
      this.folder,
      `.modrinth-${version.id}-${Date.now()}.part`,
    );
    // File names are single segments, so a real folder is enough
    await fs.mkdir(await getRealServerPath(serverId, this.folder), {
      recursive: true,
    });

    report(15, `Downloading ${project.title}`);
    const ready = progressThrottle(PROGRESS_INTERVAL_MS);
    const fileHash = await this.download(
      file.url,
      tempPath,
      file,
      (progress) => {
        if (!ready(progress === 100)) return;
        const scaled = 15 + Math.round((progress / 100) * 70);
        report(Math.min(90, scaled), `Downloading ${project.title}`);
      },
    );

    if (existing) await this.removeFile(serverId, existing.fileName);
    await this.safeUnlink(targetPath);
    await fs.rename(tempPath, targetPath);

    report(95, `Installing ${project.title}`);
    return this.persist(existing, {
      serverId,
      projectId: project.id,
      versionId: version.id,
      fileName: file.filename,
      fileHash,
      dependencyOf: options.dependencyOf,
    });
  }

  /** Delete a record's file and the record, optionally with its dependants */
  async removeRecordWithFile(
    record: ServerPluginRecord,
    cascade: boolean,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    if (visited.has(record.id)) return;
    visited.add(record.id);

    await this.removeFile(record.serverId, record.fileName);

    if (cascade) {
      for (const dependant of this.repository.listDependants(record.id)) {
        await this.removeRecordWithFile(dependant, true, visited);
      }
    }

    this.repository.delete(record.id);
  }

  /** Download and check the strongest hash we have, returns it */
  private async download(
    url: string,
    dest: string,
    file: { filename: string; hashes: { sha1?: string; sha512?: string } },
    onProgress: (progress: number) => void,
  ): Promise<string | undefined> {
    const expected = file.hashes?.sha512 ?? file.hashes?.sha1;
    const algorithm = expected ? digestAlgorithm(expected) : undefined;
    try {
      const { digests } = await download({
        url,
        dest,
        label: file.filename,
        hashes: algorithm ? { [algorithm]: expected } : undefined,
        onProgress,
      });
      return algorithm ? digests[algorithm] : expected;
    } catch (error) {
      if (error instanceof DownloadError && error.code === "integrity") {
        throw new InternalServerErrorException(
          `Integrity check failed for ${file.filename}`,
        );
      }
      throw error;
    }
  }

  private persist(
    existing: ServerPluginRecord | null | undefined,
    payload: Omit<ServerPluginRecord, "id" | "installedAt" | "updatedAt">,
  ): ServerPluginRecord {
    const record = existing
      ? this.repository.update(existing.id, {
          versionId: payload.versionId,
          fileName: payload.fileName,
          fileHash: payload.fileHash,
          dependencyOf: payload.dependencyOf,
        })
      : this.repository.create(payload);
    if (!record) {
      throw new InternalServerErrorException("Failed to persist record");
    }
    return record;
  }

  private async removeFile(serverId: string, fileName: string): Promise<void> {
    let path: string;
    try {
      path = getServerContentPath(serverId, this.folder, fileName);
      await getRealServerPath(serverId, this.folder);
    } catch {
      // Legacy names or a linked folder, never follow them
      return;
    }
    if (existsSync(path)) await this.safeUnlink(path);
  }

  private async safeUnlink(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error: unknown) {
      if (getErrorCode(error) !== "ENOENT") throw error;
    }
  }
}
