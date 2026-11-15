import { COMPANION_REPO_URL } from "@/modules/companion/companion.constants";
import { CompanionService } from "@/modules/companion/companion.service";
import { CompanionInstallerService } from "@/modules/companion/install/companion-installer.service";
import { ModrinthClient } from "@/modules/modrinth/modrinth-client.service";
import { ServerPluginsRepository } from "@/modules/database/repositories/server-plugins.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { InstalledPluginView } from "@shared/types/plugins";
import { TaskType } from "@shared/types/task.types";
import {
  ModrinthContentService,
  resolveServerGameVersion,
} from "./modrinth-content.service";

/**
 * Plugin manager - Modrinth content engine
 */
@Injectable()
export class PluginsService extends ModrinthContentService {
  constructor(
    serversRepository: ServersRepository,
    pluginsRepository: ServerPluginsRepository,
    tasksService: TasksService,
    registry: ServerTypesRegistry,
    modrinth: ModrinthClient,
    private readonly companionInstaller: CompanionInstallerService,
    private readonly companion: CompanionService,
  ) {
    super(serversRepository, tasksService, pluginsRepository, modrinth, {
      loggerName: PluginsService.name,
      projectType: "plugin",
      folder: "plugins",
      // Everything a Bukkit family server can load, proxies have no catalog
      defaultLoaders: ["paper", "spigot", "bukkit", "purpur", "folia"],
      serverSideRequired: true,
      taskTypes: {
        install: TaskType.PLUGIN_INSTALL,
        update: TaskType.PLUGIN_UPDATE,
        remove: TaskType.PLUGIN_REMOVE,
      },
      validateServer: (server) => {
        const features =
          registry.get(server.blueprintId)?.manifest.features ?? [];
        if (!features.includes("plugins:modrinth")) {
          throw new BadRequestException(
            "Plugins are not supported for this server type",
          );
        }
      },
      resolveGameVersion: (server) =>
        resolveServerGameVersion(registry, server),
    });
  }

  /** The companion jar shows up as its own row with GitHub release info */
  async listInstalled(serverId: string): Promise<InstalledPluginView[]> {
    const items = await super.listInstalled(serverId);
    const installed = await this.companionInstaller.detect(serverId);
    if (!installed) return items;

    const latest = await this.companionInstaller.latest();
    const outdated = this.companionInstaller.isOutdated(installed, latest);
    return items.map((item) =>
      item.type === "manual" && item.fileName === installed.fileName
        ? {
            ...item,
            type: "companion" as const,
            hasUpdate: outdated,
            companion: {
              version: installed.version,
              latestVersion: latest?.version ?? null,
              connected: this.companion.isConnected(serverId),
              releaseUrl: latest?.url ?? COMPANION_REPO_URL + "/releases",
            },
          }
        : item,
    );
  }
}
