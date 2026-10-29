import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ModrinthClient } from "@/modules/modrinth/modrinth-client.service";
import { ServersFactory } from "@/modules/servers/servers.factory";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { InstallModpackProps } from "@shared/types/modpack.types";
import type {
  ModrinthSearchResponse,
  ModrinthVersion,
} from "@shared/types/plugins";
import type {
  IServer,
  NewServerProps,
} from "@shared/types/server/server.types";
import { TaskType } from "@shared/types/task.types";
import { SearchModpacksDto } from "./dto/search-modpacks.dto";
import { ModpackInstaller } from "./modpack-installer.service";
import {
  ModpackStagingService,
  type StagedPack,
} from "./modpack-staging.service";

export const FABRIC_BLUEPRINT_ID = "com.kubek.fabric";
const PACK_LOADERS = ["fabric"];

/**
 * Modpack catalog and installs: a staged pack becomes a Fabric server
 * through the regular server factory
 */
@Injectable()
export class ModpacksService {
  constructor(
    private readonly modrinth: ModrinthClient,
    private readonly staging: ModpackStagingService,
    private readonly installer: ModpackInstaller,
    private readonly factory: ServersFactory,
    private readonly servers: ServersRepository,
  ) {}

  search(dto: SearchModpacksDto): Promise<ModrinthSearchResponse> {
    const facets: string[][] = [
      ["project_type:modpack"],
      PACK_LOADERS.map((loader) => `categories:${loader}`),
      ["server_side:required", "server_side:optional"],
    ];
    if (dto.gameVersion) facets.push([`versions:${dto.gameVersion}`]);
    return this.modrinth.search({
      query: dto.query,
      limit: dto.limit,
      offset: dto.offset,
      index: dto.index,
      facets,
    });
  }

  listVersions(projectId: string): Promise<ModrinthVersion[]> {
    return this.modrinth.getProjectVersions(projectId, {
      loaders: PACK_LOADERS,
    });
  }

  discard(packId: string, ownerId: string): Promise<void> {
    return this.staging.discardOwned(packId, ownerId);
  }

  install(
    props: InstallModpackProps,
    ownerId: string,
  ): { server: IServer; taskId: string } {
    const name = props.name.trim();
    if (!name) throw new BadRequestException("Name is required");
    if (this.servers.findByName(name)) {
      throw new BadRequestException("NAME_TAKEN");
    }

    const pack = this.staging.claim(props.packId, ownerId);
    try {
      return this.factory.prepareServerDataAndCreateServer(
        this.serverProps(pack, { ...props, name }),
        ownerId,
        undefined,
        {
          taskType: TaskType.SERVER_CREATE_MODPACK,
          afterInstall: (server, taskId) =>
            this.installer.apply(pack, server, taskId),
          onSettled: () => void this.staging.discard(pack),
        },
      );
    } catch (error) {
      this.staging.release(pack);
      throw error;
    }
  }

  private serverProps(
    pack: StagedPack,
    props: InstallModpackProps,
  ): NewServerProps {
    const variables: NewServerProps["variables"] = {
      GAME_VERSION: pack.manifest.minecraftVersion,
      FABRIC_LOADER_VERSION: pack.manifest.loaderVersion,
    };
    if (props.memory !== undefined) variables.XMX = props.memory;
    if (props.javaVersion !== undefined) {
      variables.JAVA_VERSION = props.javaVersion;
    }
    if (props.javaPath?.trim()) variables.JAVA_PATH = props.javaPath.trim();
    if (props.port !== undefined) variables.game = props.port;

    return { name: props.name, blueprintId: FABRIC_BLUEPRINT_ID, variables };
  }
}
