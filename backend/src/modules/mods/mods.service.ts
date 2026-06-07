import { ServerModsRepository } from "@/modules/database/repositories/server-mods.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import {
  ModrinthContentService,
  resolveServerGameVersion,
} from "@/modules/plugins/modrinth-content.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { TaskType } from "@shared/types/task.types";

/**
 * Mod manager - Modrinth content engine
 */
@Injectable()
export class ModsService extends ModrinthContentService {
  constructor(
    serversRepository: ServersRepository,
    modsRepository: ServerModsRepository,
    tasksService: TasksService,
    registry: ServerTypesRegistry,
  ) {
    super(serversRepository, tasksService, modsRepository, {
      loggerName: ModsService.name,
      projectType: "mod",
      folder: "mods",
      defaultLoaders: ["fabric"],
      serverSideRequired: false,
      taskTypes: {
        install: TaskType.MOD_INSTALL,
        update: TaskType.MOD_UPDATE,
        remove: TaskType.MOD_REMOVE,
      },
      validateServer: (server) => {
        const features =
          registry.get(server.blueprintId)?.manifest.features ?? [];
        if (!features.includes("mods:fabric")) {
          throw new BadRequestException(
            "Mods are only supported for Fabric servers",
          );
        }
      },
      resolveGameVersion: (server) =>
        resolveServerGameVersion(registry, server),
    });
  }
}
