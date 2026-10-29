import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServersService } from "@/modules/servers/servers.service";
import { Injectable, Logger } from "@nestjs/common";
import { ServerStatus } from "@shared/types/server/server.types";

const SAVE_TIMEOUT_MS = 30_000;
// Logged by the server thread once save-all flush is done. Anchored to the log
// prefix, so a player typing the same words in chat does not count
const SAVED_LINE =
  /INFO\]:?\s*(?:\[[^\]<>]*\]:?\s*)?(?:Saved the game|Saved the world|All dimensions are saved)\.?\s*$/;

/**
 * Stops world writes while an archive of a running Java server is made,
 * otherwise region files can be copied half written
 */
@Injectable()
export class WorldSaveService {
  private readonly logger = new Logger(WorldSaveService.name);

  constructor(
    private readonly servers: ServersService,
    private readonly instances: InstancesRegistry,
    private readonly blueprints: ServerTypesRegistry,
    private readonly bus: ExtensionEventBus,
  ) {}

  async hold<T>(serverId: string, work: () => Promise<T>): Promise<T> {
    const instance = this.savingInstance(serverId);
    if (!instance) return work();

    instance.input("save-off");
    const saved = this.waitForSave(serverId);
    instance.input("save-all flush");
    if (!(await saved)) {
      this.logger.warn(
        `No save confirmation from ${serverId}, archiving anyway`,
      );
    }
    try {
      return await work();
    } finally {
      instance.input("save-on");
    }
  }

  private savingInstance(serverId: string) {
    const server = this.servers.findById(serverId);
    if (server?.status !== ServerStatus.RUNNING) return null;
    const tags = this.blueprints.get(server.blueprintId)?.manifest.tags ?? [];
    // Proxies have no worlds, Bedrock uses save hold with a different flow
    if (!tags.includes("java") || tags.includes("proxy")) return null;
    return this.instances.getByServerId(serverId);
  }

  private waitForSave(serverId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => finish(false), SAVE_TIMEOUT_MS);
      const off = this.bus.on("server.log", (event) => {
        if (
          event.serverId === serverId &&
          SAVED_LINE.test(event.line.line ?? "")
        )
          finish(true);
      });
      const finish = (ok: boolean) => {
        clearTimeout(timer);
        off();
        resolve(ok);
      };
    });
  }
}
