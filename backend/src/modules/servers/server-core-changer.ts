import { TaskErrorCode } from "@/core/errors/error-codes";
import { getErrorMessage } from "@/core/utils/error";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { InstallPipeline } from "@/modules/server-types/install-pipeline.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { assertBlueprintUsable } from "@/modules/servers/blueprint-usable";
import { CUSTOM_BLUEPRINT_ID } from "@/modules/servers/servers.constants";
import {
  ServersFactory,
  writeCustomCore,
} from "@/modules/servers/servers.factory";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";
import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";

/** Change core or version of a stopped server, worlds stay */
@Injectable()
export class ServerCoreChanger {
  constructor(
    private readonly tasksService: TasksService,
    private readonly servers: ServersRepository,
    private readonly blueprintRegistry: ServerTypesRegistry,
    private readonly blueprintResolver: BlueprintResolver,
    private readonly installPipeline: InstallPipeline,
    private readonly factory: ServersFactory,
  ) {}

  /**
   * Switch a stopped server to another core/blueprint (and version)
   */
  changeCore(
    source: IServer,
    blueprintId: string,
    version: string | undefined,
    ownerId: string,
    customCoreFile?: Express.Multer.File,
  ): { server: IServer; taskId: string } {
    if (blueprintId === CUSTOM_BLUEPRINT_ID && !customCoreFile) {
      throw new BadRequestException(
        "Custom cores require an uploaded jar file",
      );
    }

    // changeCore stays within the server's frozen runtime, switching native<->docker is not allowed
    const sourceKind = source.runtimeKind ?? "native";
    const blueprint = assertBlueprintUsable(
      this.blueprintRegistry,
      blueprintId,
      sourceKind,
    );

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

    // Replace server.jar before the pipeline runs (it skips existing files)
    if (blueprintId === CUSTOM_BLUEPRINT_ID && customCoreFile) {
      writeCustomCore(source.id, customCoreFile);
    }

    const updated = this.servers.update(source.id, {
      blueprintId: blueprint.manifest.id,
      blueprintVersion: blueprint.manifest.version,
      runtimeKind: sourceKind,
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

    this.factory.broadcastServersList();

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

      this.factory.broadcastServersList();
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
}
