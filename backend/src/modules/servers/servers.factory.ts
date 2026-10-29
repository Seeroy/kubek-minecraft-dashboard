import { TaskErrorCode } from "@/core/errors/error-codes";
import type { ServerRuntimeSetting } from "@/core/types/config";
import { getErrorMessage } from "@/core/utils/error";
import { getServerPath } from "@/core/utils/serverPath";
import { ConfigService } from "@/modules/config/config.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { InstallPipeline } from "@/modules/server-types/install-pipeline.service";
import { DockerService } from "@/modules/server-types/runtime/docker.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { assertBlueprintUsable } from "@/modules/servers/blueprint-usable";
import { TasksService } from "@/modules/tasks/tasks.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  IServer,
  type NewServerProps,
  ServerStatus,
} from "@shared/types/server/server.types";
import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";
import fs from "fs";
import path from "path";

export interface CreateServerOptions {
  taskType?: TaskType;
  /** Extra provisioning after the blueprint install, a failure rolls the server back */
  afterInstall?: (server: IServer, taskId: string) => Promise<void>;
  /** Runs once the creation finished either way */
  onSettled?: () => void;
}

/** Persist an uploaded custom jar as server.jar before the install steps run */
export function writeCustomCore(
  serverId: string,
  file: Express.Multer.File,
): void {
  const extension =
    path.extname(file.originalname || "").toLowerCase() || ".jar";
  if (extension !== ".jar")
    throw new BadRequestException("Custom core must be a .jar file");
  const dir = getServerPath(serverId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "server.jar"), file.buffer);
}

/**
 * Creates servers from a blueprint. ServerCoreChanger and ServerTransfer
 * use the rollback and list broadcast from here
 */
@Injectable()
export class ServersFactory {
  constructor(
    private readonly tasksService: TasksService,
    private readonly servers: ServersRepository,
    private readonly serverEventsService: ServerEventsService,
    private readonly blueprintRegistry: ServerTypesRegistry,
    private readonly blueprintResolver: BlueprintResolver,
    private readonly installPipeline: InstallPipeline,
    private readonly configService: ConfigService,
    private readonly dockerService: DockerService,
  ) {}

  private resolveRuntime(
    manifest: KubekBlueprintManifest,
    override?: "native" | "docker",
  ): "native" | "docker" {
    const hasProfile = !!manifest.dockerProfile;
    const available = this.dockerService.available();
    const requireDocker = (reason: string): "docker" => {
      if (!hasProfile) {
        throw new BadRequestException(
          `${reason} but this core has no docker profile`,
        );
      }
      if (!available) {
        throw new BadRequestException(
          `${reason} but the daemon is not reachable`,
        );
      }
      return "docker";
    };

    // docker-only blueprint must run in docker, no matter the override or setting
    if (manifest.runtime.kind === "docker") {
      return requireDocker("This core requires Docker");
    }
    // explicit per-server override wins over the global setting
    if (override === "docker") return requireDocker("Docker was requested");
    if (override === "native") return "native";

    const setting: ServerRuntimeSetting =
      this.configService.get("serverRuntime") ?? "auto";
    if (setting === "docker") return requireDocker("serverRuntime is docker");
    if (setting === "native") return "native";
    return hasProfile && available ? "docker" : "native";
  }

  /**
   * Resolve the blueprint for a new server, validate its variables against the manifest,
   * create the DB row, then run the install pipeline
   */
  prepareServerDataAndCreateServer(
    props: NewServerProps,
    ownerId: string,
    customCoreFile?: Express.Multer.File,
    options: CreateServerOptions = {},
  ) {
    const blueprint = assertBlueprintUsable(
      this.blueprintRegistry,
      props.blueprintId,
    );

    const variables = this.blueprintResolver.validateVariables(
      blueprint.manifest,
      props.variables,
    );
    if (this.servers.findByName(props.name)) {
      throw new BadRequestException("NAME_TAKEN");
    }

    const server = this.servers.create({
      name: props.name,
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: true, attempts: 3 },
      folderId: null,
      blueprintId: blueprint.manifest.id,
      blueprintVersion: blueprint.manifest.version,
      runtimeKind: this.resolveRuntime(blueprint.manifest, props.runtime),
      variables,
      createdBy: ownerId || null,
    });

    const taskId = this.tasksService.createTask(
      options.taskType ?? TaskType.SERVER_CREATE,
      { serverId: server.id, serverName: props.name },
      ownerId,
    );

    this.broadcastServersList();

    // Fire-and-forget: createServer marks the task FAILED on error and rethrows
    void this.createServer(blueprint, server, taskId, customCoreFile, options)
      .catch((e) => {
        console.error(
          `[ServersFactory] createServer failed (task ${taskId}):`,
          e?.message ?? e,
        );
      })
      .finally(() => options.onSettled?.());

    return { taskId, server };
  }

  private async createServer(
    blueprint: LoadedBlueprint,
    server: IServer,
    taskId: string,
    customCoreFile?: Express.Multer.File,
    options: CreateServerOptions = {},
  ): Promise<IServer> {
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 0,
    });

    try {
      if (customCoreFile) writeCustomCore(server.id, customCoreFile);

      await this.installPipeline.run(blueprint, server, taskId);
      await options.afterInstall?.(server, taskId);

      this.broadcastServersList();
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        step: TaskSteps.COMPLETED,
        progress: 100,
        result: { serverId: server.id },
      });
      return server;
    } catch (e: unknown) {
      this.discardCreated(server.id);
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
   * Remove a half-made server after a failed flow, folder and row go
   * so the name is free again
   */
  discardCreated(serverId: string): void {
    try {
      fs.rmSync(path.resolve(getServerPath(serverId)), {
        recursive: true,
        force: true,
      });
    } catch {
      // best effort, the row still goes away
    }
    this.servers.delete(serverId);
    this.broadcastServersList();
  }

  /**
   * Emit the current servers list to keep all connected clients in sync
   */
  broadcastServersList(): void {
    const servers = this.servers.findAll();
    this.serverEventsService.emitServerList(servers);
  }
}
