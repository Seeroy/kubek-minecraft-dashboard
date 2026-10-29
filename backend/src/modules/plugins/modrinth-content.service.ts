import { getErrorMessage } from "@/core/utils/error";
import { TaskErrorCode } from "@/core/errors/error-codes";
import { IServerPluginsRepository } from "@/modules/database/repositories/server-plugins.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import {
  ContentInstaller,
  InstallContext,
} from "@/modules/modrinth/content-installer";
import { resolveDependencies } from "@/modules/modrinth/dependency-resolver";
import { ModrinthClient } from "@/modules/modrinth/modrinth-client.service";
import { InstalledContentReader } from "@/modules/modrinth/installed-content-reader";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import {
  InstalledPluginView,
  ModrinthProject,
  ModrinthSearchResponse,
  ModrinthVersion,
  PluginInstallDependencyInput,
  ServerPluginRecord,
} from "@shared/types/plugins";
import { IServer } from "@shared/types/server/server.types";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { InstallPluginDto } from "./dto/install-plugin.dto";
import {
  ProjectVersionsQueryDto,
  SearchPluginsDto,
} from "./dto/search-plugins.dto";
import { RemovePluginDto, UpdatePluginDto } from "./dto/update-plugin.dto";

/**
 * Read the game version a server runs from its variables, by
 * locating the blueprint variable whose options come from the version list
 */
export function resolveServerGameVersion(
  registry: ServerTypesRegistry,
  server: IServer,
): string | undefined {
  const manifest = registry.get(server.blueprintId)?.manifest;
  const versionVar = manifest?.variables.find(
    (variable) => variable.options?.from === "versions",
  );
  if (!versionVar) return undefined;
  const value = server.variables[versionVar.key];
  return value != null ? String(value) : undefined;
}

/**
 * Per-kind configuration that turns the generic Modrinth engine into either a
 * plugin manager or a mod manager
 */
export interface ContentEngineConfig {
  loggerName: string;
  projectType: "plugin" | "mod";
  folder: "plugins" | "mods";
  defaultLoaders: string[];
  serverSideRequired: boolean;
  taskTypes: {
    install: TaskType;
    update: TaskType;
    remove: TaskType;
  };
  /** Throw if the given server cannot host this kind of content */
  validateServer: (server: IServer) => void;
  /**
   * Resolve the server's target game version
   */
  resolveGameVersion?: (server: IServer) => string | undefined;
}

interface InstallTaskOptions {
  serverId: string;
  projectContext: InstallContext;
  dependencies: PluginInstallDependencyInput[];
  existingRecordOverride?: ServerPluginRecord;
}

/**
 * Generic Modrinth content engine shared by the plugin and mod managers
 */
export abstract class ModrinthContentService {
  protected readonly logger: Logger;
  protected readonly installer: ContentInstaller;
  private readonly installedReader: InstalledContentReader;

  protected constructor(
    protected readonly serversRepository: ServersRepository,
    protected readonly tasksService: TasksService,
    protected readonly contentRepository: IServerPluginsRepository,
    protected readonly modrinth: ModrinthClient,
    protected readonly config: ContentEngineConfig,
  ) {
    this.logger = new Logger(config.loggerName);
    this.installer = new ContentInstaller(
      config.folder,
      contentRepository,
      tasksService,
    );
    this.installedReader = new InstalledContentReader(
      modrinth,
      config.folder,
      config.defaultLoaders,
      this.logger,
    );
  }

  search(dto: SearchPluginsDto): Promise<ModrinthSearchResponse> {
    const facets: string[][] = [[`project_type:${this.config.projectType}`]];
    if (this.config.serverSideRequired) facets.push(["server_side:required"]);
    if (dto.loader) facets.push([`categories:${dto.loader}`]);
    dto.categories?.forEach((category) =>
      facets.push([`categories:${category}`]),
    );
    if (dto.gameVersion) facets.push([`versions:${dto.gameVersion}`]);

    return this.modrinth.search({
      query: dto.query,
      limit: dto.limit,
      offset: dto.offset,
      index: dto.index,
      facets,
    });
  }

  getProject(projectIdOrSlug: string): Promise<ModrinthProject> {
    return this.modrinth.getProject(projectIdOrSlug);
  }

  getProjectVersions(
    projectIdOrSlug: string,
    query: ProjectVersionsQueryDto,
  ): Promise<ModrinthVersion[]> {
    const loaders = [...this.config.defaultLoaders];
    if (query.loader) loaders.push(query.loader);
    return this.modrinth.getProjectVersions(projectIdOrSlug, {
      loaders,
      gameVersions: query.gameVersion ? [query.gameVersion] : undefined,
    });
  }

  async listInstalled(serverId: string): Promise<InstalledPluginView[]> {
    const server = this.requireServer(serverId);
    return this.installedReader.read(
      serverId,
      this.contentRepository.findByServer(serverId),
      this.config.resolveGameVersion?.(server),
    );
  }

  async installPlugin(
    userId: string,
    dto: InstallPluginDto,
  ): Promise<{ taskId: string }> {
    const server = this.requireServer(dto.serverId);
    const context = await this.prepareInstallContext(
      dto.projectId,
      dto.versionId,
    );
    const dependencies = await this.collectDependencies(
      context.version,
      dto.installDependencies ?? false,
      dto.dependencies,
    );

    const taskId = this.startTask(
      userId,
      this.config.taskTypes.install,
      server,
      { project: context.project, version: context.version.version_number },
      `Preparing to install ${context.project.title}`,
    );

    this.runInBackground(
      taskId,
      TaskErrorCode.CONTENT_INSTALL_FAILED,
      "Failed to install",
      () =>
        this.executeInstallTask(taskId, {
          serverId: server.id,
          projectContext: context,
          dependencies,
        }),
    );

    return { taskId };
  }

  async updatePlugin(
    userId: string,
    serverId: string,
    pluginId: string,
    dto: UpdatePluginDto,
  ): Promise<{ taskId: string }> {
    const { record, server } = this.requireRecord(serverId, pluginId);
    const context = await this.prepareInstallContext(
      record.projectId,
      dto.versionId,
    );
    const dependencies = await this.collectDependencies(
      context.version,
      dto.reinstall ?? false,
      dto.dependencies,
    );

    const taskId = this.startTask(
      userId,
      this.config.taskTypes.update,
      server,
      { project: context.project, version: context.version.version_number },
      `Updating ${context.project.title}`,
    );

    this.runInBackground(
      taskId,
      TaskErrorCode.CONTENT_UPDATE_FAILED,
      "Failed to update",
      () =>
        this.executeInstallTask(taskId, {
          serverId: server.id,
          projectContext: context,
          dependencies,
          existingRecordOverride: record,
        }),
    );

    return { taskId };
  }

  async removePlugin(
    userId: string,
    serverId: string,
    pluginId: string,
    dto: RemovePluginDto,
  ): Promise<{ taskId: string }> {
    const { record, server } = this.requireRecord(serverId, pluginId);
    const project = await this.getProject(record.projectId);

    const taskId = this.startTask(
      userId,
      this.config.taskTypes.remove,
      server,
      { project },
      `Removing ${project.title}`,
      10,
    );

    this.runInBackground(
      taskId,
      TaskErrorCode.CONTENT_REMOVE_FAILED,
      "Failed to remove",
      async () => {
        await this.installer.removeRecordWithFile(
          record,
          dto.removeDependants ?? true,
        );
        this.tasksService.updateTask(taskId, {
          status: TaskStatus.SUCCESS,
          progress: 100,
          message: "Removed",
          result: { pluginId: record.id },
        });
      },
    );

    return { taskId };
  }

  private async executeInstallTask(
    taskId: string,
    options: InstallTaskOptions,
  ): Promise<void> {
    const { serverId, projectContext } = options;

    const mainRecord = await this.installer.installSingle({
      taskId,
      serverId,
      context: projectContext,
      existingRecordOverride: options.existingRecordOverride,
    });

    const installedDependencies: ServerPluginRecord[] = [];
    for (const dependency of options.dependencies) {
      const context = await this.prepareInstallContext(
        dependency.projectId,
        dependency.versionId,
      );
      installedDependencies.push(
        await this.installer.installSingle({
          taskId,
          serverId,
          context,
          dependencyOf: mainRecord.id,
          suppressProgress: true,
        }),
      );
    }

    this.tasksService.updateTask(taskId, {
      status: TaskStatus.SUCCESS,
      progress: 100,
      message: `Installed ${projectContext.project.title}`,
      result: {
        pluginId: mainRecord.id,
        dependencies: installedDependencies.map((dep) => dep.id),
      },
    });
  }

  private collectDependencies(
    version: ModrinthVersion,
    installRequired: boolean,
    explicit?: PluginInstallDependencyInput[],
  ): Promise<PluginInstallDependencyInput[]> {
    return resolveDependencies(version, {
      installRequired,
      explicit,
      latestVersionOf: async (projectId) =>
        (await this.getProjectVersions(projectId, {}))[0]?.id,
      onLookupError: (projectId, error) =>
        this.logger.warn(
          `Failed to resolve dependency for project ${projectId}: ${getErrorMessage(error)}`,
        ),
    });
  }

  private async prepareInstallContext(
    projectIdOrSlug: string,
    versionId: string,
  ): Promise<InstallContext> {
    const project = await this.modrinth.getProject(projectIdOrSlug);
    const version = await this.modrinth.getVersion(versionId);
    if (version.project_id !== project.id) {
      throw new BadRequestException(
        `Version ${version.id} does not belong to project ${project.id}`,
      );
    }
    return { project, version };
  }

  private requireServer(serverId: string): IServer {
    const server = this.serversRepository.findById(serverId);
    if (!server) throw new NotFoundException("Server not found");
    this.config.validateServer(server);
    return server;
  }

  private requireRecord(
    serverId: string,
    recordId: string,
  ): { record: ServerPluginRecord; server: IServer } {
    const record = this.contentRepository.findById(recordId);
    if (!record) throw new NotFoundException("Record not found");
    if (record.serverId !== serverId) {
      throw new NotFoundException("Record not found on this server");
    }
    return { record, server: this.requireServer(record.serverId) };
  }

  private startTask(
    userId: string,
    type: TaskType,
    server: IServer,
    { project, version }: { project: ModrinthProject; version?: string },
    message: string,
    progress = 5,
  ): string {
    const taskId = this.tasksService.createTask(
      type,
      {
        serverId: server.id,
        serverName: server.name,
        pluginId: project.id,
        pluginName: project.title,
        versionName: version,
      },
      userId,
    );
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress,
      message,
    });
    return taskId;
  }

  private runInBackground(
    taskId: string,
    code: TaskErrorCode,
    fallback: string,
    work: () => Promise<void>,
  ): void {
    void work().catch((error: any) => {
      this.logger.error(`${fallback} (task ${taskId})`, error?.stack || error);
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: { code, message: error?.message ?? fallback },
      });
    });
  }
}
