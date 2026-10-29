import { getErrorMessage } from "@/core/utils/error";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { ServerInstanceFactory } from "@/modules/instances/server-instance.factory";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServerBootService } from "@/modules/servers/server-boot.service";
import { ServerCoreChanger } from "@/modules/servers/server-core-changer";
import { ServersFactory } from "@/modules/servers/servers.factory";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { IServerDiagnostic } from "@shared/types/server/instance.types";
import {
  IServer,
  NewServerProps,
  ServerStatus,
} from "@shared/types/server/server.types";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { IUser } from "@shared/types/user.types";

@Injectable()
export class ServersService {
  constructor(
    private readonly serversRepo: ServersRepository,
    private readonly instancesRepo: InstancesRegistry,
    private readonly instanceFactory: ServerInstanceFactory,
    private readonly serversFactory: ServersFactory,
    private readonly coreChanger: ServerCoreChanger,
    private readonly tasks: TasksService,
    private readonly blueprintRegistry: ServerTypesRegistry,
    private readonly blueprintResolver: BlueprintResolver,
    private readonly boot: ServerBootService,
  ) {}

  findAll(): IServer[] {
    return this.serversRepo.findAll();
  }

  findById(id: string): IServer | null {
    return this.serversRepo.findById(id);
  }

  findByName(name: string): IServer | null {
    return this.serversRepo.findByName(name);
  }

  getInstance(serverId: string) {
    const server = this.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");
    return this.ensureInstance(server);
  }

  /** Recent recognized errors / health issues for a server (in-memory buffer) */
  getDiagnostics(serverId: string): IServerDiagnostic[] {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");
    const instance = this.instancesRepo.getByServerId(serverId);
    return instance ? instance.getDiagnostics() : [];
  }

  create(
    props: NewServerProps,
    ownerId?: string,
    customCoreFile?: Express.Multer.File,
  ): { server: IServer; taskId: string } {
    return this.serversFactory.prepareServerDataAndCreateServer(
      props,
      ownerId || "",
      customCoreFile,
    );
  }

  /** Ensure ServerInstance exists in memory for runtime control */
  private ensureInstance(server: IServer) {
    const existing = this.instancesRepo.getByServerId(server.id);
    if (existing) return existing;
    return this.instancesRepo.add(this.instanceFactory.create(server));
  }

  private async executeServerOperation(
    taskType: TaskType,
    server: IServer,
    ownerId: string | undefined,
    operation: (instance: ServerInstance) => Promise<boolean>,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    const taskId = this.tasks.createTask(
      taskType,
      { serverId: server.id, serverName: server.name },
      ownerId,
    );
    this.tasks.updateTask(taskId, { status: TaskStatus.RUNNING });

    try {
      const instance = this.ensureInstance(server);
      const ok = await operation(instance);
      if (ok) {
        this.tasks.updateTask(taskId, {
          status: TaskStatus.SUCCESS,
          result: { serverId: server.id },
        });
      } else {
        this.tasks.updateTask(taskId, {
          status: TaskStatus.FAILED,
          error: { code: errorCode, message: errorMessage },
        });
      }
    } catch (e: unknown) {
      this.tasks.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: { code: `${errorCode}_ERROR`, message: getErrorMessage(e) },
      });
      throw e;
    }
  }

  async start(serverId: string, ownerId?: string) {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");
    // Wait for boot reconcile, the container may be about to get adopted
    await this.boot.containersReady;

    await this.executeServerOperation(
      TaskType.SERVER_START,
      server,
      ownerId,
      (instance) => instance.start(),
      "START_FAILED",
      "Failed to start",
    );
  }

  async stop(serverId: string, byUser: IUser) {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    await this.executeServerOperation(
      TaskType.SERVER_STOP,
      server,
      byUser.id,
      (instance) => instance.stop(byUser),
      "STOP_FAILED",
      "Failed to stop",
    );
  }

  async kill(serverId: string) {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const instance = this.ensureInstance(server);
    await instance.kill();
    return;
  }

  async restart(serverId: string, byUser: IUser) {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    await this.executeServerOperation(
      TaskType.SERVER_RESTART,
      server,
      byUser.id,
      (instance) => instance.restart(byUser),
      "RESTART_FAILED",
      "Failed to restart",
    );
  }

  async getServerProperties(serverId: string): Promise<Record<string, string>> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const instance = this.ensureInstance(server);
    const properties = await instance.readServerProperties();

    if (!properties) {
      throw new NotFoundException("Server properties file not found");
    }

    return properties;
  }

  async saveServerProperties(
    serverId: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const instance = this.ensureInstance(server);
    const success = await instance.writeServerProperties(properties);

    if (!success) {
      throw new BadRequestException("Failed to write server properties");
    }
  }

  /** Blueprint variable names keyed by their settings path */
  variableLabels(server: IServer): Record<string, string> {
    const variables =
      this.blueprintRegistry.get(server.blueprintId)?.manifest.variables ?? [];
    return Object.fromEntries(
      variables.map((v) => [`variables.${v.key}`, v.label ?? v.key]),
    );
  }

  async updateServerSettings(
    serverId: string,
    updates: {
      name?: string;
      restartOnError?: { enabled: boolean; attempts: number };
      variables?: Record<string, string | number | boolean>;
    },
  ): Promise<IServer> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const updateData: Partial<IServer> = {};

    if (updates.name !== undefined) {
      const owner = this.serversRepo.findByName(updates.name);
      if (owner && owner.id !== serverId) {
        throw new BadRequestException("NAME_TAKEN");
      }
      updateData.name = updates.name;
    }

    if (updates.restartOnError !== undefined) {
      updateData.restartOnError = updates.restartOnError;
    }

    if (updates.variables !== undefined) {
      const blueprint = this.blueprintRegistry.get(server.blueprintId);
      if (!blueprint)
        throw new BadRequestException("Server blueprint not found");
      updateData.variables = this.blueprintResolver.validateVariables(
        blueprint.manifest,
        {
          ...server.variables,
          ...updates.variables,
        },
      );
    }

    const updated = this.serversRepo.update(serverId, updateData);
    if (!updated) {
      throw new NotFoundException("Failed to update server");
    }

    // Update instance config if it exists
    const instance = this.instancesRepo.getByServerId(serverId);
    if (instance) {
      // Update the instance's internal config
      (instance as any).config = updated;
    }

    return updated;
  }

  changeCore(
    serverId: string,
    dto: { blueprintId: string; version?: string },
    ownerId?: string,
    customCoreFile?: Express.Multer.File,
  ): { server: IServer; taskId: string } {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    if (
      server.status !== ServerStatus.STOPPED &&
      server.status !== ServerStatus.CRASHED
    ) {
      throw new BadRequestException("Stop the server before changing its core");
    }

    const result = this.coreChanger.changeCore(
      server,
      dto.blueprintId,
      dto.version,
      ownerId || "",
      customCoreFile,
    );

    // Drop the cached instance so it is rebuilt from the new blueprint
    if (this.instancesRepo.getByServerId(serverId)) {
      this.instancesRepo.delete(serverId);
    }

    return result;
  }
}
