import { ServerPluginsRepository } from "@/modules/database/repositories/server-plugins.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { BadRequestException, Injectable } from "@nestjs/common";
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
  ) {
    super(serversRepository, tasksService, pluginsRepository, {
      loggerName: PluginsService.name,
      projectType: "plugin",
      folder: "plugins",
      defaultLoaders: ["paper", "spigot", "bukkit"],
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
}
