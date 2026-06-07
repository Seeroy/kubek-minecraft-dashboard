import { getErrorMessage } from "@/core/utils/error";
import { getServerPath } from "@/core/utils/serverPath";
import { AuthService } from "@/modules/auth/auth.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ErrorRecognizerService } from "@/modules/error-recognition/error-recognizer.service";
import { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { JavaService } from "@/modules/java/java.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { QueryRegistry } from "@/modules/server-types/query-protocols/query-registry.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServersFactory } from "@/modules/servers/servers.factory";
import type {
  BulkDeleteResult,
  ExportArtifact,
} from "@/modules/servers/servers.types";
import { TasksService } from "@/modules/tasks/tasks.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type { IServerDiagnostic } from "@shared/types/server/instance.types";
import {
  IServer,
  NewServerProps,
  ServerStatus,
} from "@shared/types/server/server.types";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { IUser } from "@shared/types/user.types";
import fs from "fs";
import { Jimp } from "jimp";
import { join } from "path";

@Injectable()
export class ServersService implements OnModuleInit {
  constructor(
    private readonly serversRepo: ServersRepository,
    private readonly instancesRepo: InstancesRegistry,
    private readonly javaService: JavaService,
    private readonly serversFactory: ServersFactory,
    private readonly tasks: TasksService,
    private readonly serverEventsService: ServerEventsService,
    private readonly errorRecognizerService: ErrorRecognizerService,
    private readonly usersRepo: UsersRepository,
    private readonly authService: AuthService,
    private readonly blueprintRegistry: ServerTypesRegistry,
    private readonly queryRegistry: QueryRegistry,
    private readonly blueprintResolver: BlueprintResolver,
  ) {}

  /**
   * On module initialization, set all servers to stopped status
   */
  onModuleInit() {
    const servers = this.serversRepo.findAll();
    servers.forEach((server) => {
      if (server.status !== ServerStatus.STOPPED) {
        this.serversRepo.update(server.id, {
          status: ServerStatus.STOPPED,
        });
      }
    });
  }

  /**
   * Find all servers
   * @returns Array of all servers
   */
  findAll(): IServer[] {
    return this.serversRepo.findAll();
  }

  /**
   * Find server by ID
   * @param id - Server ID
   * @returns Server or null if not found
   */
  findById(id: string): IServer | null {
    return this.serversRepo.findById(id);
  }

  /**
   * Find server by name
   * @param name - Server name
   * @returns Server or null if not found
   */
  findByName(name: string): IServer | null {
    return this.serversRepo.findByName(name);
  }

  /**
   * Get the server instance for a given server ID
   * @param serverId - The ID of the server
   * @returns The server instance
   */
  getInstance(serverId: string) {
    return this.ensureInstance(this.findById(serverId)!);
  }

  /** Recent recognized errors / health issues for a server (in-memory buffer) */
  getDiagnostics(serverId: string): IServerDiagnostic[] {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");
    const instance = this.instancesRepo.getByServerId(serverId);
    return instance ? instance.getDiagnostics() : [];
  }

  /**
   * Create a new server
   * @param props - Server creation properties
   * @param ownerId - ID of the server owner
   * @param customCoreFile - Optional custom core file
   * @returns Object containing the created server and task ID
   */
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
    const instance = new ServerInstance(
      {
        javaService: this.javaService,
        serverEventsService: this.serverEventsService,
        errorRecognizerService: this.errorRecognizerService,
        serversRepo: this.serversRepo,
        blueprintRegistry: this.blueprintRegistry,
        queryRegistry: this.queryRegistry,
        blueprintResolver: this.blueprintResolver,
      },
      server,
      server.id,
    );
    this.instancesRepo.add(instance);
    return instance;
  }

  /**
   * Execute a server operation with task tracking
   * @param taskType - The type of task to create
   * @param server - The server to operate on
   * @param ownerId - The ID of the user initiating the operation
   * @param operation - The async operation to execute
   * @param errorCode - Error code for failed operations
   * @param errorMessage - Error message for failed operations
   */
  private async executeServerOperation(
    taskType: TaskType,
    server: IServer,
    ownerId: string | undefined,
    operation: (instance: any) => Promise<boolean>,
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

  /**
   * Start a server instance
   * @param serverId - The ID of the server to start
   * @param ownerId - The ID of the user initiating the start
   */
  async start(serverId: string, ownerId?: string) {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    await this.executeServerOperation(
      TaskType.SERVER_START,
      server,
      ownerId,
      (instance) => instance.start(),
      "START_FAILED",
      "Failed to start",
    );
  }

  /**
   * Stop a server instance
   * @param serverId - The ID of the server to stop
   * @param byUser - The user initiating the stop operation
   */
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

  /**
   * Force kill a server instance
   * @param serverId - The ID of the server to kill
   */
  async kill(serverId: string) {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const instance = this.ensureInstance(server);
    await instance.kill();
    return;
  }

  /**
   * Restart a server instance
   * @param serverId - The ID of the server to restart
   * @param byUser - The user initiating the restart operation
   */
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

  /**
   * Read server.properties file
   */
  async getServerProperties(serverId: string): Promise<Record<string, any>> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const instance = this.ensureInstance(server);
    const properties = await instance.readServerProperties();

    if (!properties || properties === false) {
      throw new NotFoundException("Server properties file not found");
    }

    return properties as Record<string, any>;
  }

  /**
   * Save server.properties file
   */
  async saveServerProperties(
    serverId: string,
    properties: Record<string, string>,
  ): Promise<void> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    const instance = this.ensureInstance(server);
    const success = await instance.writeServerProperties(properties);

    if (!success) {
      throw new BadRequestException("Failed to write server properties");
    }
  }

  /**
   * Upload and convert server icon to 64x64 PNG
   */
  async uploadServerIcon(
    serverId: string,
    file: Express.Multer.File,
  ): Promise<void> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    if (!file) {
      throw new BadRequestException("No file provided");
    }

    try {
      const serverPath = getServerPath(serverId);
      const iconPath = join(serverPath, "server-icon.png");

      // Convert and resize image to 64x64 PNG (cover = crop to fill, centered)
      const image = await Jimp.read(file.buffer);
      image.cover({ w: 64, h: 64 });
      const buffer = await image.getBuffer("image/png");
      fs.writeFileSync(iconPath, buffer);

      return;
    } catch (error: unknown) {
      throw new BadRequestException(
        `Failed to process icon: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Update server settings (name, restart settings, blueprint variables)
   */
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

  /**
   * Verify whether the given user has access to a specific server
   */
  private userHasServerAccess(user: IUser, serverId: string): boolean {
    if (user.isAdmin) return true;
    if (!user.serversRestrict?.enabled) return true;
    return !!user.serversRestrict.allowed?.includes(serverId);
  }

  /**
   * Stop a running instance
   */
  private async tearDownInstance(serverId: string): Promise<void> {
    const instance = this.instancesRepo.getByServerId(serverId);
    if (!instance) return;
    try {
      await instance.kill();
    } catch {
      // ignore: process may already be dead
    }
    this.instancesRepo.delete(serverId);
  }

  /**
   * Broadcast updated servers list over WebSocket
   */
  private broadcastServersList(): void {
    this.serverEventsService.emitServerList(this.serversRepo.findAll());
  }

  /**
   * Delete server permanently after verifying user password and confirmation name
   */
  async delete(
    serverId: string,
    user: IUser,
    password: string,
    confirmName: string,
  ): Promise<void> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");

    if (server.name !== confirmName) {
      throw new BadRequestException("NAME_MISMATCH");
    }

    const passwordValid = await this.authService.comparePasswords(
      password,
      user.password,
    );
    if (!passwordValid) {
      // Not UnauthorizedException: 401 triggers the client's auto-logout hook
      throw new BadRequestException("INVALID_PASSWORD");
    }

    await this.tearDownInstance(serverId);

    const dir = getServerPath(serverId);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e: unknown) {
      throw new BadRequestException(
        `Failed to remove server files: ${getErrorMessage(e)}`,
      );
    }

    this.serversRepo.delete(serverId);
    this.broadcastServersList();
  }

  /**
   * Delete multiple servers atomically (after a single password check)
   * Returns lists of successfully deleted and failed server IDs
   */
  async bulkDelete(
    ids: string[],
    user: IUser,
    password: string,
  ): Promise<BulkDeleteResult> {
    const passwordValid = await this.authService.comparePasswords(
      password,
      user.password,
    );
    if (!passwordValid) {
      // Not UnauthorizedException: 401 triggers the client's auto-logout hook
      throw new BadRequestException("INVALID_PASSWORD");
    }

    const deleted: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const id of ids) {
      const server = this.serversRepo.findById(id);
      if (!server) {
        failed.push({ id, reason: "NOT_FOUND" });
        continue;
      }
      if (!this.userHasServerAccess(user, id)) {
        failed.push({ id, reason: "FORBIDDEN" });
        continue;
      }
      try {
        await this.tearDownInstance(id);
        fs.rmSync(getServerPath(id), { recursive: true, force: true });
        this.serversRepo.delete(id);
        deleted.push(id);
      } catch (e: unknown) {
        failed.push({ id, reason: getErrorMessage(e) });
      }
    }

    if (deleted.length > 0) this.broadcastServersList();
    return { deleted, failed };
  }

  /**
   * Duplicate an existing server: clone DB row + copy data directory under a new name
   */
  duplicate(
    sourceId: string,
    newName: string,
    ownerId?: string,
  ): { server: IServer; taskId: string } {
    return this.serversFactory.duplicateServer(
      sourceId,
      newName,
      ownerId || "",
    );
  }

  /**
   * Build a zip stream of the server directory plus a manifest file
   */
  async exportServer(serverId: string): Promise<ExportArtifact> {
    const server = this.serversRepo.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");
    return this.serversFactory.exportServer(server);
  }

  /**
   * Import a server from a kubek-export zip archive
   */
  async importServer(
    file: Express.Multer.File,
    overrideName: string | undefined,
    ownerId?: string,
  ): Promise<{ server: IServer; taskId: string }> {
    if (!file) throw new BadRequestException("No archive provided");
    return this.serversFactory.importServer(file, overrideName, ownerId || "");
  }
}
