import { TaskErrorCode } from "@/core/errors/error-codes";
import { downloadWithProgress } from "@/core/utils/downloadWithProgress";
import { getErrorCode } from "@/core/utils/error";
import { getServerPath } from "@/core/utils/serverPath";
import { IServerPluginsRepository } from "@/modules/database/repositories/server-plugins.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  InstalledPluginView,
  ModrinthProject,
  ModrinthProjectSummary,
  ModrinthSearchResponse,
  ModrinthVersion,
  ModrinthVersionSummary,
  PluginInstallDependencyInput,
  ServerPluginRecord,
} from "@shared/types/plugins";
import { IServer } from "@shared/types/server/server.types";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { createHash } from "crypto";
import { existsSync, promises as fs } from "fs";
import ky, { KyInstance } from "ky";
import { join } from "path";
import {
  InstallPluginDependencyDto,
  InstallPluginDto,
} from "./dto/install-plugin.dto";
import {
  ProjectVersionsQueryDto,
  SearchPluginsDto,
} from "./dto/search-plugins.dto";
import { RemovePluginDto, UpdatePluginDto } from "./dto/update-plugin.dto";

interface InstallContext {
  project: ModrinthProject;
  version: ModrinthVersion;
}

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

/**
 * Generic Modrinth content engine shared by the plugin and mod managers
 */
export abstract class ModrinthContentService {
  protected readonly logger: Logger;
  protected readonly modrinth: KyInstance;

  protected constructor(
    protected readonly serversRepository: ServersRepository,
    protected readonly tasksService: TasksService,
    protected readonly contentRepository: IServerPluginsRepository,
    protected readonly config: ContentEngineConfig,
  ) {
    this.logger = new Logger(config.loggerName);
    this.modrinth = ky.create({
      prefixUrl: "https://api.modrinth.com/v2",
      headers: {
        "User-Agent": "KubekPanel/2026 (https://kubekpanel.ru)",
      },
      timeout: 15000,
    });
  }

  async search(dto: SearchPluginsDto): Promise<ModrinthSearchResponse> {
    const facets: string[][] = [[`project_type:${this.config.projectType}`]];

    if (this.config.serverSideRequired) {
      facets.push(["server_side:required"]);
    }

    if (dto.loader) {
      facets.push([`categories:${dto.loader}`]);
    }

    if (dto.categories?.length) {
      dto.categories.forEach((category) => {
        facets.push([`categories:${category}`]);
      });
    }

    if (dto.gameVersion) {
      facets.push([`versions:${dto.gameVersion}`]);
    }

    const searchParams = new URLSearchParams();
    if (dto.query) searchParams.set("query", dto.query);
    searchParams.set("limit", String(dto.limit ?? 20));
    searchParams.set("offset", String(dto.offset ?? 0));
    searchParams.set("facets", JSON.stringify(facets));

    const response = await this.modrinth
      .get("search", { searchParams })
      .json<ModrinthSearchResponse>();

    return response;
  }

  async getProject(projectIdOrSlug: string): Promise<ModrinthProject> {
    return this.modrinth
      .get(`project/${projectIdOrSlug}`)
      .json<ModrinthProject>();
  }

  async getProjectVersions(
    projectIdOrSlug: string,
    query: ProjectVersionsQueryDto,
  ): Promise<ModrinthVersion[]> {
    const searchParams = new URLSearchParams();
    const loaders = [...this.config.defaultLoaders];
    if (query.gameVersion) {
      searchParams.append("game_versions", JSON.stringify([query.gameVersion]));
    }
    if (query.loader) {
      loaders.push(query.loader);
    }
    searchParams.append("loaders", JSON.stringify([loaders]));

    return this.modrinth
      .get(`project/${projectIdOrSlug}/version`, {
        searchParams,
      })
      .json<ModrinthVersion[]>();
  }

  async listInstalled(serverId: string): Promise<InstalledPluginView[]> {
    const server = this.serversRepository.findById(serverId);
    if (!server) {
      throw new NotFoundException("Server not found");
    }

    this.config.validateServer(server);

    const records = this.contentRepository.findByServer(serverId);

    // Game version the server runs, used to gate compatible updates
    const gameVersion = this.config.resolveGameVersion?.(server);

    const projectCache = new Map<string, ModrinthProject>();
    const versionsCache = new Map<string, ModrinthVersion[]>();

    const results: InstalledPluginView[] = [];

    // Add Modrinth-installed records
    for (const record of records) {
      const project =
        projectCache.get(record.projectId) ??
        (await this.getProject(record.projectId));
      projectCache.set(project.id, project);

      const allVersions =
        versionsCache.get(record.projectId) ??
        (await this.getAllVersions(record.projectId));
      versionsCache.set(record.projectId, allVersions);

      const installedVersion =
        allVersions.find((version) => version.id === record.versionId) ??
        (await this.getVersion(record.versionId));

      // The newest version that actually runs on this server (matching loader
      // and game version), not merely the newest version of the project
      const latestVersion = this.pickLatestCompatible(allVersions, gameVersion);
      const hasUpdate = !!(
        latestVersion &&
        latestVersion.id !== installedVersion.id &&
        new Date(latestVersion.date_published).getTime() >
          new Date(installedVersion.date_published).getTime()
      );

      const summary: InstalledPluginView = {
        ...record,
        type: "modrinth",
        metadata: this.projectToSummary(project),
        version: this.versionToSummary(installedVersion),
        hasUpdate,
        latestVersion: hasUpdate
          ? this.versionToSummary(latestVersion!)
          : undefined,
      };

      results.push(summary);
    }

    // Add manual jar files
    const contentDir = join(getServerPath(serverId), this.config.folder);
    try {
      const files = await fs.readdir(contentDir);
      const jarFiles = files.filter((file) => file.endsWith(".jar"));

      for (const jarFile of jarFiles) {
        // Check if this jar is already managed by Modrinth
        const existingRecord = records.find(
          (record) => record.fileName === jarFile,
        );
        if (existingRecord) continue;

        const filePath = join(contentDir, jarFile);
        const stats = await fs.stat(filePath);

        const manualEntry: InstalledPluginView = {
          id: `manual-${jarFile}`,
          serverId,
          projectId: "",
          versionId: "",
          fileName: jarFile,
          fileHash: undefined,
          dependencyOf: undefined,
          installedAt: stats.mtime.getTime(),
          updatedAt: undefined,
          type: "manual",
          hasUpdate: false,
        };

        results.push(manualEntry);
      }
    } catch (error) {
      // Directory doesn't exist or can't be read, skip manual entries
      this.logger.warn(
        `Could not read ${this.config.folder} directory for server ${serverId}: ${error}`,
      );
    }

    return results;
  }

  async installPlugin(
    userId: string,
    dto: InstallPluginDto,
  ): Promise<{ taskId: string }> {
    const server = this.serversRepository.findById(dto.serverId);
    if (!server) {
      throw new NotFoundException("Server not found");
    }

    this.config.validateServer(server);

    const context = await this.prepareInstallContext(
      dto.projectId,
      dto.versionId,
    );

    const dependencies = await this.resolveDependencies(
      context.version,
      dto.installDependencies ?? false,
      dto.dependencies,
    );

    const taskId = this.tasksService.createTask(
      this.config.taskTypes.install,
      {
        serverId: server.id,
        serverName: server.name,
        pluginId: context.project.id,
        pluginName: context.project.title,
      },
      userId,
    );

    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 5,
      message: `Preparing to install ${context.project.title}`,
    });

    void this.executeInstallTask(taskId, {
      serverId: server.id,
      projectContext: context,
      dependencies,
    }).catch((error: any) => {
      this.logger.error(
        `Failed to install ${dto.projectId} on server ${server.id}`,
        error?.stack || error,
      );
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: {
          code: TaskErrorCode.CONTENT_INSTALL_FAILED,
          message: error?.message ?? "Failed to install",
        },
      });
    });

    return { taskId };
  }

  async updatePlugin(
    userId: string,
    serverId: string,
    pluginId: string,
    dto: UpdatePluginDto,
  ): Promise<{ taskId: string }> {
    const record = this.contentRepository.findById(pluginId);
    if (!record) {
      throw new NotFoundException("Record not found");
    }

    if (record.serverId !== serverId) {
      throw new NotFoundException("Record not found on this server");
    }

    const server = this.serversRepository.findById(record.serverId);
    if (!server) {
      throw new NotFoundException("Server not found");
    }

    this.config.validateServer(server);

    const context = await this.prepareInstallContext(
      record.projectId,
      dto.versionId,
    );

    const dependencies = await this.resolveDependencies(
      context.version,
      dto.reinstall ?? false,
      dto.dependencies,
    );

    const taskId = this.tasksService.createTask(
      this.config.taskTypes.update,
      {
        serverId: server.id,
        serverName: server.name,
        pluginId: context.project.id,
        pluginName: context.project.title,
      },
      userId,
    );

    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 5,
      message: `Updating ${context.project.title}`,
    });

    void this.executeInstallTask(taskId, {
      serverId: server.id,
      projectContext: context,
      dependencies,
      existingRecordOverride: record,
    }).catch((error: any) => {
      this.logger.error(`Failed to update ${pluginId}`, error?.stack || error);
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: {
          code: TaskErrorCode.CONTENT_UPDATE_FAILED,
          message: error?.message ?? "Failed to update",
        },
      });
    });

    return { taskId };
  }

  async removePlugin(
    userId: string,
    serverId: string,
    pluginId: string,
    dto: RemovePluginDto,
  ): Promise<{ taskId: string }> {
    const record = this.contentRepository.findById(pluginId);
    if (!record) {
      throw new NotFoundException("Record not found");
    }

    if (record.serverId !== serverId) {
      throw new NotFoundException("Record not found on this server");
    }

    const server = this.serversRepository.findById(record.serverId);
    if (!server) {
      throw new NotFoundException("Server not found");
    }

    this.config.validateServer(server);

    const project = await this.getProject(record.projectId);

    const taskId = this.tasksService.createTask(
      this.config.taskTypes.remove,
      {
        serverId: server.id,
        serverName: server.name,
        pluginId: project.id,
        pluginName: project.title,
      },
      userId,
    );

    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      progress: 10,
      message: `Removing ${project.title}`,
    });

    void this.executeRemoveTask(
      taskId,
      record,
      dto.removeDependants ?? true,
    ).catch((error: any) => {
      this.logger.error(`Failed to remove ${pluginId}`, error?.stack || error);
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: {
          code: TaskErrorCode.CONTENT_REMOVE_FAILED,
          message: error?.message ?? "Failed to remove",
        },
      });
    });

    return { taskId };
  }

  private async executeInstallTask(
    taskId: string,
    options: {
      serverId: string;
      projectContext: InstallContext;
      dependencies: PluginInstallDependencyInput[];
      existingRecordOverride?: ServerPluginRecord;
    },
  ): Promise<void> {
    const { serverId, projectContext, dependencies, existingRecordOverride } =
      options;

    const installedDependencies: ServerPluginRecord[] = [];

    const mainRecord = await this.installSingle({
      taskId,
      serverId,
      context: projectContext,
      dependencyOf: undefined,
      suppressProgress: false,
      existingRecordOverride,
    });

    for (const dependency of dependencies) {
      const dependencyContext = await this.prepareInstallContext(
        dependency.projectId,
        dependency.versionId,
      );

      const record = await this.installSingle({
        taskId,
        serverId,
        context: dependencyContext,
        dependencyOf: mainRecord.id,
        suppressProgress: true,
      });
      installedDependencies.push(record);
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

  private async executeRemoveTask(
    taskId: string,
    record: ServerPluginRecord,
    removeDependants: boolean,
  ): Promise<void> {
    await this.removeRecordWithFile(record, removeDependants);

    this.tasksService.updateTask(taskId, {
      status: TaskStatus.SUCCESS,
      progress: 100,
      message: "Removed",
      result: { pluginId: record.id },
    });
  }

  private async installSingle(options: {
    taskId: string;
    serverId: string;
    context: InstallContext;
    dependencyOf?: string;
    suppressProgress?: boolean;
    existingRecordOverride?: ServerPluginRecord;
  }): Promise<ServerPluginRecord> {
    const {
      taskId,
      serverId,
      context,
      dependencyOf,
      suppressProgress,
      existingRecordOverride,
    } = options;

    const version = context.version;
    const project = context.project;

    const existing =
      existingRecordOverride ??
      this.contentRepository.findByServerAndProject(serverId, project.id);

    if (existing && existing.versionId === version.id) {
      if (!suppressProgress) {
        this.tasksService.updateTask(taskId, {
          progress: 100,
          message: `${project.title} is already up to date`,
        });
      }
      return existing;
    }

    const file = this.pickPrimaryFile(version);
    if (!file?.url) {
      throw new BadRequestException(
        `Version ${version.id} does not provide downloadable files`,
      );
    }

    const contentDir = join(getServerPath(serverId), this.config.folder);
    await fs.mkdir(contentDir, { recursive: true });

    const targetPath = join(contentDir, file.filename);
    const tempPath = join(
      contentDir,
      `.modrinth-${version.id}-${Date.now()}-${file.filename}`,
    );

    if (!suppressProgress) {
      this.tasksService.updateTask(taskId, {
        message: `Downloading ${project.title}`,
        progress: 15,
      });
    }

    await downloadWithProgress(file.url, tempPath, (progress) => {
      if (suppressProgress) return;
      const scaled = 15 + Math.round((progress / 100) * 70);
      this.tasksService.updateTask(taskId, {
        progress: Math.min(90, scaled),
        message: `Downloading ${project.title}`,
      });
    });

    const expectedHash = file.hashes?.sha512 ?? file.hashes?.sha1 ?? undefined;
    let computedHash: string | undefined;
    if (expectedHash) {
      const algorithm = expectedHash.length === 128 ? "sha512" : "sha1";
      computedHash = await this.computeHash(tempPath, algorithm);
      if (computedHash.toLowerCase() !== expectedHash.toLowerCase()) {
        await this.safeUnlink(tempPath);
        throw new InternalServerErrorException(
          `Integrity check failed for ${file.filename}`,
        );
      }
    }

    if (existing) {
      const existingPath = join(contentDir, existing.fileName);
      if (existsSync(existingPath)) {
        await this.safeUnlink(existingPath);
      }
    }

    if (existsSync(targetPath)) {
      await this.safeUnlink(targetPath);
    }

    await fs.rename(tempPath, targetPath);

    if (!suppressProgress) {
      this.tasksService.updateTask(taskId, {
        progress: 95,
        message: `Installing ${project.title}`,
      });
    }

    const payload = {
      serverId,
      projectId: project.id,
      versionId: version.id,
      fileName: file.filename,
      fileHash: computedHash ?? expectedHash,
      dependencyOf,
    };

    const record = existing
      ? this.contentRepository.update(existing.id, {
          versionId: payload.versionId,
          fileName: payload.fileName,
          fileHash: payload.fileHash,
          dependencyOf: payload.dependencyOf,
        })
      : this.contentRepository.create(payload);

    if (!record) {
      throw new InternalServerErrorException("Failed to persist record");
    }

    return record;
  }

  private async removeRecordWithFile(
    record: ServerPluginRecord,
    cascade: boolean,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    if (visited.has(record.id)) return;
    visited.add(record.id);

    const contentDir = join(getServerPath(record.serverId), this.config.folder);
    const filePath = join(contentDir, record.fileName);

    if (existsSync(filePath)) {
      await this.safeUnlink(filePath);
    }

    if (cascade) {
      const dependants = this.contentRepository.listDependants(record.id);
      for (const dependant of dependants) {
        await this.removeRecordWithFile(dependant, true, visited);
      }
    }

    this.contentRepository.delete(record.id);
  }

  private async resolveDependencies(
    version: ModrinthVersion,
    installRequired: boolean,
    explicitDependencies?: InstallPluginDependencyDto[],
  ): Promise<PluginInstallDependencyInput[]> {
    const resolved: PluginInstallDependencyInput[] = [];
    const addedKeys = new Set<string>();

    const addDependency = (dep: PluginInstallDependencyInput) => {
      const key = `${dep.projectId}:${dep.versionId}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        resolved.push(dep);
      }
    };

    if (explicitDependencies?.length) {
      explicitDependencies.forEach((dep) => addDependency(dep));
    }

    if (installRequired && version.dependencies?.length) {
      for (const dependency of version.dependencies) {
        if (dependency.dependencyType !== "required") continue;
        if (!dependency.projectId) continue;

        if (dependency.versionId) {
          addDependency({
            projectId: dependency.projectId,
            versionId: dependency.versionId,
          });
          continue;
        }

        try {
          const latestVersions = await this.getProjectVersions(
            dependency.projectId,
            {},
          );
          if (latestVersions.length > 0) {
            addDependency({
              projectId: dependency.projectId,
              versionId: latestVersions[0].id,
            });
          }
        } catch (error) {
          this.logger.warn(
            `Failed to resolve dependency for project ${dependency.projectId}: ${error}`,
          );
        }
      }
    }

    return resolved;
  }

  private async prepareInstallContext(
    projectIdOrSlug: string,
    versionId: string,
  ): Promise<InstallContext> {
    const project = await this.getProject(projectIdOrSlug);
    const version = await this.getVersion(versionId);

    if (version.project_id !== project.id) {
      throw new BadRequestException(
        `Version ${version.id} does not belong to project ${project.id}`,
      );
    }

    return { project, version };
  }

  private async getVersion(versionId: string): Promise<ModrinthVersion> {
    return this.modrinth.get(`version/${versionId}`).json<ModrinthVersion>();
  }

  /** Every published version of a project */
  private async getAllVersions(
    projectIdOrSlug: string,
  ): Promise<ModrinthVersion[]> {
    return this.modrinth
      .get(`project/${projectIdOrSlug}/version`)
      .json<ModrinthVersion[]>();
  }

  /** Whether a Modrinth version can run on this server's loader and game version */
  private isVersionCompatible(
    version: ModrinthVersion,
    gameVersion?: string,
  ): boolean {
    const loaderMatch = version.loaders?.some((loader) =>
      this.config.defaultLoaders.includes(loader.toLowerCase()),
    );
    if (!loaderMatch) return false;
    if (gameVersion && !version.game_versions?.includes(gameVersion)) {
      return false;
    }
    return true;
  }

  /** Newest compatible version by publish date, or undefined if none match */
  private pickLatestCompatible(
    versions: ModrinthVersion[],
    gameVersion?: string,
  ): ModrinthVersion | undefined {
    return versions
      .filter((version) => this.isVersionCompatible(version, gameVersion))
      .reduce<ModrinthVersion | undefined>((latest, version) => {
        if (!latest) return version;
        return new Date(version.date_published).getTime() >
          new Date(latest.date_published).getTime()
          ? version
          : latest;
      }, undefined);
  }

  private pickPrimaryFile(version: ModrinthVersion) {
    if (!version.files?.length) return null;
    const primary = version.files.find((file) => file.primary);
    return primary ?? version.files[0];
  }

  private projectToSummary(project: ModrinthProject): ModrinthProjectSummary {
    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      description: project.description,
      projectType: project.project_type,
      iconUrl: project.icon_url,
      downloads: project.downloads,
      serverSide: project.server_side,
      clientSide: project.client_side,
      categories: project.categories,
      displayCategories: project.additional_categories ?? project.categories,
      color: project.color,
      latestVersionIds: project.versions ?? [],
    };
  }

  private versionToSummary(version: ModrinthVersion): ModrinthVersionSummary {
    return {
      id: version.id,
      name: version.name,
      versionNumber: version.version_number,
      changelog: version.changelog,
      publishedAt: version.date_published,
      loaders: version.loaders,
      gameVersions: version.game_versions,
      downloads: version.downloads,
      files: version.files.map((file) => ({
        filename: file.filename,
        primary: file.primary,
        url: file.url,
        hashes: file.hashes,
        fileType: file.fileType ?? (file as any).file_type,
        size: file.size,
      })),
      dependencies: version.dependencies.map((dependency) => ({
        projectId: dependency.project_id,
        versionId: dependency.version_id,
        dependencyType: dependency.dependencyType,
        fileName: dependency.fileName,
      })),
    };
  }

  private async computeHash(
    filePath: string,
    algorithm: "sha1" | "sha512",
  ): Promise<string> {
    const file = await fs.readFile(filePath);
    return createHash(algorithm).update(file).digest("hex");
  }

  private async safeUnlink(path: string) {
    try {
      await fs.unlink(path);
    } catch (error: unknown) {
      if (getErrorCode(error) !== "ENOENT") {
        throw error;
      }
    }
  }
}
