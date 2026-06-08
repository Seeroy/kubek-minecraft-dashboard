import { TaskErrorCode } from "@/core/errors/error-codes";
import { unpackArchive } from "@/core/utils/archives";
import { getErrorMessage } from "@/core/utils/error";
import { getServerPath } from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { InstallPipeline } from "@/modules/server-types/install-pipeline.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import {
  CUSTOM_BLUEPRINT_ID,
  EXPORT_MANIFEST_FILE,
  EXPORT_MANIFEST_VERSION,
} from "@/modules/servers/servers.constants";
import type {
  ExportArtifact,
  ExportManifest,
} from "@/modules/servers/servers.types";
import { TasksService } from "@/modules/tasks/tasks.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  IServer,
  type NewServerProps,
  ServerStatus,
} from "@shared/types/server/server.types";
import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";
import compressing from "compressing";
import fs from "fs";
import os from "os";
import path from "path";

@Injectable()
export class ServersFactory {
  constructor(
    private readonly tasksService: TasksService,
    private readonly servers: ServersRepository,
    private readonly serverEventsService: ServerEventsService,
    private readonly blueprintRegistry: ServerTypesRegistry,
    private readonly blueprintResolver: BlueprintResolver,
    private readonly installPipeline: InstallPipeline,
  ) {}

  /**
   * Resolve the blueprint for a new server, validate its variables against the manifest,
   * create the DB row, then run the install pipeline
   */
  prepareServerDataAndCreateServer(
    props: NewServerProps,
    ownerId: string,
    customCoreFile?: Express.Multer.File,
  ) {
    const blueprint = this.blueprintRegistry.get(props.blueprintId);
    if (!blueprint || !blueprint.valid) {
      throw new BadRequestException(
        `Unknown or invalid blueprint: ${props.blueprintId}`,
      );
    }
    if (!this.blueprintRegistry.isSupportedHere(blueprint.manifest)) {
      throw new BadRequestException(
        `Blueprint ${props.blueprintId} is not supported on this platform (${process.platform})`,
      );
    }

    const variables = this.blueprintResolver.validateVariables(
      blueprint.manifest,
      props.variables,
    );

    const server = this.servers.create({
      name: props.name,
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: true, attempts: 3 },
      folderId: null,
      blueprintId: blueprint.manifest.id,
      blueprintVersion: blueprint.manifest.version,
      runtimeKind: blueprint.manifest.runtime.kind,
      variables,
    });

    const taskId = this.tasksService.createTask(
      TaskType.SERVER_CREATE,
      { serverId: server.id, serverName: props.name },
      ownerId,
    );

    this.broadcastServersList();

    // Fire-and-forget: createServer marks the task FAILED on error and rethrows
    void this.createServer(blueprint, server, taskId, customCoreFile).catch(
      (e) => {
        console.error(
          `[ServersFactory] createServer failed (task ${taskId}):`,
          e?.message ?? e,
        );
      },
    );

    return { taskId, server };
  }

  private async createServer(
    blueprint: LoadedBlueprint,
    server: IServer,
    taskId: string,
    customCoreFile?: Express.Multer.File,
  ): Promise<IServer> {
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 0,
    });

    try {
      if (customCoreFile) this.writeCustomCore(server.id, customCoreFile);

      await this.installPipeline.run(blueprint, server, taskId);

      this.broadcastServersList();
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        step: TaskSteps.COMPLETED,
        progress: 100,
        result: { serverId: server.id },
      });
      return server;
    } catch (e: unknown) {
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        step: TaskSteps.FAILED,
        error: {
          code: TaskErrorCode.SERVER_CREATE_ERROR,
          message: getErrorMessage(e),
        },
      });
      throw e;
    }
  }

  /**
   * Switch a stopped server to another core/blueprint (and version)
   */
  changeCore(
    source: IServer,
    blueprintId: string,
    version: string | undefined,
    ownerId: string,
  ): { server: IServer; taskId: string } {
    if (blueprintId === CUSTOM_BLUEPRINT_ID) {
      throw new BadRequestException(
        "Custom cores require an uploaded jar; recreate the server instead",
      );
    }

    const blueprint = this.blueprintRegistry.get(blueprintId);
    if (!blueprint || !blueprint.valid) {
      throw new BadRequestException(
        `Unknown or invalid blueprint: ${blueprintId}`,
      );
    }
    if (!this.blueprintRegistry.isSupportedHere(blueprint.manifest)) {
      throw new BadRequestException(
        `Blueprint ${blueprintId} is not supported on this platform (${process.platform})`,
      );
    }

    // Carry over the existing variable values
    const versionVar = this.blueprintResolver.versionVariable(
      blueprint.manifest,
    );
    const incoming: Record<string, unknown> = { ...source.variables };
    if (versionVar) {
      if (!version) {
        throw new BadRequestException("A version is required for this core");
      }
      incoming[versionVar.key] = version;
    }
    const variables = this.blueprintResolver.validateVariables(
      blueprint.manifest,
      incoming,
    );

    const updated = this.servers.update(source.id, {
      blueprintId: blueprint.manifest.id,
      blueprintVersion: blueprint.manifest.version,
      runtimeKind: blueprint.manifest.runtime.kind,
      variables,
    });
    if (!updated) {
      throw new NotFoundException("Failed to update server");
    }

    const taskId = this.tasksService.createTask(
      TaskType.SERVER_CHANGE_CORE,
      { serverId: updated.id, serverName: updated.name },
      ownerId,
    );

    this.broadcastServersList();

    void this.runCoreChange(blueprint, updated, taskId).catch((e) => {
      console.error(
        `[ServersFactory] changeCore failed (task ${taskId}):`,
        e?.message ?? e,
      );
    });

    return { server: updated, taskId };
  }

  private async runCoreChange(
    blueprint: LoadedBlueprint,
    server: IServer,
    taskId: string,
  ): Promise<void> {
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 0,
    });

    try {
      // skipExistingFiles keeps worlds and configs
      await this.installPipeline.run(blueprint, server, taskId, {
        skipExistingFiles: true,
      });

      this.broadcastServersList();
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        step: TaskSteps.COMPLETED,
        progress: 100,
        result: { serverId: server.id },
      });
    } catch (e: unknown) {
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        step: TaskSteps.FAILED,
        error: {
          code: TaskErrorCode.SERVER_CHANGE_CORE_ERROR,
          message: getErrorMessage(e),
        },
      });
      throw e;
    }
  }

  /** Persist an uploaded custom jar as server.jar before the install steps run */
  private writeCustomCore(serverId: string, file: Express.Multer.File): void {
    const extension =
      path.extname(file.originalname || "").toLowerCase() || ".jar";
    if (extension !== ".jar")
      throw new BadRequestException("Custom core must be a .jar file");
    const dir = getServerPath(serverId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "server.jar"), file.buffer);
  }

  /**
   * Emit the current servers list to keep all connected clients in sync
   */
  private broadcastServersList() {
    const servers = this.servers.findAll();
    this.serverEventsService.emitServerList(servers);
  }

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
    });

    const taskId = this.tasksService.createTask(
      TaskType.SERVER_DUPLICATE,
      { serverId: cloned.id, serverName: cloned.name },
      ownerId,
    );

    this.broadcastServersList();

    void this.runDuplicateCopy(source.id, cloned, taskId);

    return { server: cloned, taskId };
  }

  private async runDuplicateCopy(
    sourceId: string,
    cloned: IServer,
    taskId: string,
  ): Promise<void> {
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
      this.broadcastServersList();
    } catch (e: unknown) {
      // Roll back DB row on failure to avoid orphaned servers
      try {
        fs.rmSync(destDir, { recursive: true, force: true });
      } catch {
        // best effort
      }
      this.servers.delete(cloned.id);
      this.broadcastServersList();

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

  /**
   * Build a zip archive in a temporary location containing the server
   * directory plus a manifest with kubek metadata
   */
  async exportServer(server: IServer): Promise<ExportArtifact> {
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

    // Stage the manifest inside the server dir for the duration of the zip op
    const manifestPath = path.join(sourceDir, EXPORT_MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-export-"));
    const archivePath = path.join(tempDir, "server.zip");

    try {
      await compressing.zip.compressDir(sourceDir, archivePath, {
        ignoreBase: true,
      });
    } catch (e: unknown) {
      try {
        fs.unlinkSync(manifestPath);
      } catch {
        /* ignore */
      }
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
    file: Express.Multer.File,
    overrideName: string | undefined,
    ownerId: string,
  ): Promise<{ server: IServer; taskId: string }> {
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
      variables: manifest.server.variables ?? {},
    });

    const taskId = this.tasksService.createTask(
      TaskType.SERVER_IMPORT,
      { serverId: created.id, serverName: created.name },
      ownerId,
    );

    this.broadcastServersList();

    void this.runImportMove(extractDir, created, taskId);

    return { server: created, taskId };
  }

  private async runImportMove(
    extractDir: string,
    created: IServer,
    taskId: string,
  ): Promise<void> {
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
      this.broadcastServersList();
    } catch (e: unknown) {
      try {
        fs.rmSync(path.resolve(getServerPath(created.id)), {
          recursive: true,
          force: true,
        });
      } catch {
        /* ignore */
      }
      this.servers.delete(created.id);
      this.broadcastServersList();

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
