import { ServerLocksService } from "@/core/locks/server-locks.service";
import { NetworksRepository } from "@/modules/database/repositories/networks.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ErrorRecognizerService } from "@/modules/error-recognition/error-recognizer.service";
import { JavaService } from "@/modules/java/java.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { QueryRegistry } from "@/modules/server-types/query-protocols/query-registry.service";
import { DockerService } from "@/modules/server-types/runtime/docker.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import { Injectable } from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";
import { ServerInstance, type ServerInstanceDeps } from "./instance";
import { LaunchCommandBuilder } from "./launch-command-builder";

/** Creates server instances with all their deps */
@Injectable()
export class ServerInstanceFactory {
  private readonly deps: ServerInstanceDeps;

  constructor(
    javaService: JavaService,
    serverEventsService: ServerEventsService,
    errorRecognizerService: ErrorRecognizerService,
    serversRepo: ServersRepository,
    blueprintRegistry: ServerTypesRegistry,
    queryRegistry: QueryRegistry,
    blueprintResolver: BlueprintResolver,
    dockerService: DockerService,
    locks: ServerLocksService,
    networksRepo: NetworksRepository,
  ) {
    this.deps = {
      serverEventsService,
      errorRecognizerService,
      serversRepo,
      blueprintRegistry,
      queryRegistry,
      blueprintResolver,
      locks,
      launcher: new LaunchCommandBuilder({
        javaService,
        blueprintResolver,
        dockerService,
        serversRepo,
        networksRepo,
      }),
    };
  }

  create(server: IServer): ServerInstance {
    return new ServerInstance(this.deps, server, server.id);
  }
}
