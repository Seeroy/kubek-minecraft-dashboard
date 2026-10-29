import { TaskErrorCode } from "@/core/errors/error-codes";
import { pack, unpackArchive } from "@/core/utils/archives";
import { getErrorMessage } from "@/core/utils/error";
import { getServerPath } from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { assertLaunchVariablesSafeForRequest } from "@/modules/server-types/launch-args";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import {
  EXPORT_MANIFEST_FILE,
  EXPORT_MANIFEST_VERSION,
} from "@/modules/servers/servers.constants";
import { ServersFactory } from "@/modules/servers/servers.factory";
import type {
  ExportArtifact,
  ExportManifest,
} from "@/modules/servers/servers.types";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from "@nestjs/common";
import { IServer, ServerStatus } from "@shared/types/server/server.types";
import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";
import fs from "fs";
import os from "os";
import path from "path";

// A finished export waits this long for its download
const EXPORT_TTL_MS = 10 * 60 * 1000;

interface PendingExport {
  artifact: ExportArtifact;
  ownerId: string;
  timer: ReturnType<typeof setTimeout>;
}

/** Duplicate, export and import of whole servers */
@Injectable()
export class ServerTransfer implements OnModuleDestroy {
  private readonly exports = new Map<string, PendingExport>();

  constructor(
    private readonly tasksService: TasksService,
    private readonly servers: ServersRepository,
    private readonly blueprintRegistry: ServerTypesRegistry,
    private readonly factory: ServersFactory,
  ) {}

  /**
   * Duplicate an existing server: clone the DB entry under a new name, then
   * copy the source directory into the new server's directory asynchronously
   */
  duplicateServer(
    sourceId: string,
    newName: string,
    ownerId: string,
  ): { server: IServer; taskId: string } {
    const source = this.servers.findById(sourceId);
    if (!source) throw new NotFoundException("Source server not found");

    const trimmed = newName.trim();
    if (!trimmed) throw new BadRequestException("Name is required");
    if (this.servers.findByName(trimmed)) {
      throw new BadRequestException("NAME_TAKEN");
    }

    const cloned = this.servers.create({
      name: trimmed,
      status: ServerStatus.STOPPED,
      restartOnError: { ...source.restartOnError },
      folderId: source.folderId ?? null,
      blueprintId: source.blueprintId,
      blueprintVersion: source.blueprintVersion,
      runtimeKind: source.runtimeKind,
      variables: { ...source.variables },
      createdBy: ownerId || null,
    });

    const taskId = this.tasksService.createTask(
      TaskType.SERVER_DUPLICATE,
      { serverId: cloned.id, serverName: cloned.name },
      ownerId,
    );

    this.factory.broadcastServersList();

    this.runDuplicateCopy(source.id, cloned, taskId);

    return { server: cloned, taskId };
  }

  private runDuplicateCopy(
    sourceId: string,
    cloned: IServer,
    taskId: string,
  ): void {
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 10,
      message: "Copying server files",
    });

    const sourceDir = path.resolve(getServerPath(sourceId));
    const destDir = path.resolve(getServerPath(cloned.id));

    try {
      if (fs.existsSync(sourceDir)) {
        fs.cpSync(sourceDir, destDir, { recursive: true, force: true });
      } else {
        fs.mkdirSync(destDir, { recursive: true });
      }

      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        step: TaskSteps.COMPLETED,
        progress: 100,
        result: { serverId: cloned.id },
      });
      this.factory.broadcastServersList();
    } catch (e: unknown) {
      this.factory.discardCreated(cloned.id);

      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        step: TaskSteps.FAILED,
        error: {
          code: TaskErrorCode.SERVER_DUPLICATE_ERROR,
          message: getErrorMessage(e),
        },
      });
    }
  }

  /** Pack the server in a task, the archive is picked up with takeExport */
  startExport(serverId: string, ownerId: string): { taskId: string } {
    const server = this.servers.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const task = this.tasksService.runTask(
      TaskType.SERVER_EXPORT,
      ownerId,
      async (taskId) => {
        const artifact = await this.exportServer(serverId, (progress) =>
          this.tasksService.updateTask(taskId, { progress }),
        );
        this.exports.set(taskId, {
          artifact,
          ownerId,
          timer: setTimeout(() => this.dropExport(taskId), EXPORT_TTL_MS),
        });
        return { fileName: artifact.suggestedName };
      },
      { serverId, serverName: server.name },
    );
    return { taskId: task.id };
  }

  /** Hand the archive over once, the caller cleans it up after sending */
  takeExport(taskId: string, userId: string): ExportArtifact {
    const pending = this.exports.get(taskId);
    if (!pending || pending.ownerId !== userId) {
      throw new NotFoundException("Export not found or expired");
    }
    clearTimeout(pending.timer);
    this.exports.delete(taskId);
    return pending.artifact;
  }

  onModuleDestroy(): void {
    for (const taskId of [...this.exports.keys()]) this.dropExport(taskId);
  }

  private dropExport(taskId: string): void {
    const pending = this.exports.get(taskId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.exports.delete(taskId);
    pending.artifact.cleanup();
  }

  /**
   * Build a zip archive in a temporary location containing the server
   * directory plus a manifest with kubek metadata
   */
  async exportServer(
    serverId: string,
    onProgress?: (percent: number) => void,
  ): Promise<ExportArtifact> {
    const server = this.servers.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const sourceDir = path.resolve(getServerPath(server.id));
    if (!fs.existsSync(sourceDir)) {
      throw new BadRequestException("Server directory not found on disk");
    }

    const manifest: ExportManifest = {
      kubekExport: EXPORT_MANIFEST_VERSION,
      exportedAt: new Date().toISOString(),
      server: {
        name: server.name,
        restartOnError: server.restartOnError,
        blueprintId: server.blueprintId,
        blueprintVersion: server.blueprintVersion,
        runtimeKind: server.runtimeKind,
        variables: server.variables,
      },
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-export-"));
    const archivePath = path.join(tempDir, "server.zip");
    // Kept out of the server dir, a link there would redirect the write
    const manifestPath = path.join(tempDir, EXPORT_MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    try {
      // Explicit file list, packing the folder would follow links out of it
      const files = (await listRegularFiles(sourceDir)).filter(
        (file) => file.relativePath !== EXPORT_MANIFEST_FILE,
      );
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      let lastPercent = -1;
      const sources = [
        ...files,
        { path: manifestPath, relativePath: EXPORT_MANIFEST_FILE },
      ];
      await pack(sources, archivePath, {
        totalBytes,
        onProgress: onProgress
          ? (written, total) => {
              // Compressed bytes lag behind raw ones, 100 is left for the task end
              const percent = Math.min(99, Math.floor((written / total) * 100));
              if (percent === lastPercent) return;
              lastPercent = percent;
              onProgress(percent);
            }
          : undefined,
      });
    } catch (e: unknown) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw new BadRequestException(
        `Failed to build export archive: ${getErrorMessage(e)}`,
      );
    } finally {
      try {
        fs.unlinkSync(manifestPath);
      } catch {
        /* ignore */
      }
    }

    const safeName = server.name.replace(/[^\p{L}\p{N}._-]+/gu, "_");
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suggestedName = `kubek-export-${safeName}-${date}.zip`;

    return {
      archivePath,
      suggestedName,
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
  }

  /**
   * Import a previously exported zip archive as a new server
   */
  async importServer(
    file: Express.Multer.File | undefined,
    overrideName: string | undefined,
    ownerId: string,
  ): Promise<{ server: IServer; taskId: string }> {
    if (!file) throw new BadRequestException("No archive provided");

    const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-import-"));
    const archivePath = path.join(extractDir, "upload.zip");
    fs.writeFileSync(archivePath, file.buffer);

    const ok = await unpackArchive(archivePath, extractDir, true);
    if (!ok) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      throw new BadRequestException("Failed to unpack archive");
    }

    const manifestPath = path.join(extractDir, EXPORT_MANIFEST_FILE);
    if (!fs.existsSync(manifestPath)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      throw new BadRequestException("Manifest missing - not a kubek export");
    }

    let manifest: ExportManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      fs.rmSync(extractDir, { recursive: true, force: true });
      throw new BadRequestException("Manifest is corrupted");
    }

    if (manifest.kubekExport !== EXPORT_MANIFEST_VERSION) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      throw new BadRequestException("Unsupported manifest version");
    }

    const desiredName = (
      overrideName?.trim() ||
      manifest.server.name ||
      ""
    ).trim();
    if (!desiredName) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      throw new BadRequestException("Server name is empty");
    }
    if (this.servers.findByName(desiredName)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      throw new BadRequestException("NAME_TAKEN");
    }

    if (!manifest.server.blueprintId) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      throw new BadRequestException(
        "Archive has no blueprint - not importable",
      );
    }

    // JAVA_PATH is host-specific and must never come from an untrusted archive
    const importedVariables = { ...manifest.server.variables };
    delete importedVariables.JAVA_PATH;
    const importedBlueprint = this.blueprintRegistry.get(
      manifest.server.blueprintId,
    );
    if (importedBlueprint?.manifest) {
      try {
        assertLaunchVariablesSafeForRequest(
          importedBlueprint.manifest,
          importedVariables,
        );
      } catch (err) {
        fs.rmSync(extractDir, { recursive: true, force: true });
        throw err;
      }
    }

    const created = this.servers.create({
      name: desiredName,
      status: ServerStatus.STOPPED,
      restartOnError: manifest.server.restartOnError ?? {
        enabled: true,
        attempts: 3,
      },
      folderId: null,
      blueprintId: manifest.server.blueprintId,
      blueprintVersion: manifest.server.blueprintVersion,
      runtimeKind: manifest.server.runtimeKind ?? "native",
      variables: importedVariables,
      createdBy: ownerId || null,
    });

    const taskId = this.tasksService.createTask(
      TaskType.SERVER_IMPORT,
      { serverId: created.id, serverName: created.name },
      ownerId,
    );

    this.factory.broadcastServersList();

    this.runImportMove(extractDir, created, taskId);

    return { server: created, taskId };
  }

  private runImportMove(
    extractDir: string,
    created: IServer,
    taskId: string,
  ): void {
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 30,
      message: "Restoring server files",
    });

    try {
      // Remove manifest before moving (we already parsed it)
      const manifestPath = path.join(extractDir, EXPORT_MANIFEST_FILE);
      if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);

      const destDir = path.resolve(getServerPath(created.id));
      fs.mkdirSync(path.dirname(destDir), { recursive: true });
      // The temp dir contains extracted server contents - copy them in
      fs.cpSync(extractDir, destDir, { recursive: true, force: true });
      fs.rmSync(extractDir, { recursive: true, force: true });

      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        step: TaskSteps.COMPLETED,
        progress: 100,
        result: { serverId: created.id },
      });
      this.factory.broadcastServersList();
    } catch (e: unknown) {
      this.factory.discardCreated(created.id);

      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        step: TaskSteps.FAILED,
        error: {
          code: TaskErrorCode.SERVER_IMPORT_ERROR,
          message: getErrorMessage(e),
        },
      });
    }
  }
}

// Regular files under dir with archive paths, symlinks are not followed
async function listRegularFiles(
  dir: string,
  rel = "",
): Promise<{ path: string; relativePath: string; size: number }[]> {
  const out: { path: string; relativePath: string; size: number }[] = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const relativePath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await listRegularFiles(full, relativePath)));
    } else if (entry.isFile()) {
      const size = (await fs.promises.stat(full).catch(() => null))?.size;
      if (size !== undefined) out.push({ path: full, relativePath, size });
    }
  }
  return out;
}
