import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type {
  ExtEventMap,
  ExtEventName,
  Unsubscribe,
} from "@kubekpanel/extension-sdk";
import { Injectable } from "@nestjs/common";
import { EventEmitter } from "node:events";

/**
 * Normalized event stream extensions subscribe to. The core publishes here from the single places
 * that already own each event; extensions never publish
 * core events. Capability gating happens in the extension context layer, not here
 */
@Injectable()
export class ExtensionEventBus {
  private readonly emitter = new EventEmitter();

  constructor(private readonly serversRepo: ServersRepository) {
    // extensions may add many handlers; lift the default listener cap
    this.emitter.setMaxListeners(0);
  }

  publish<K extends ExtEventName>(event: K, payload: ExtEventMap[K]): void {
    this.emitter.emit(event, this.normalize(event, payload));
  }

  on<K extends ExtEventName>(
    event: K,
    handler: (payload: ExtEventMap[K]) => void,
  ): Unsubscribe {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  /** Custom namespaced events an extension publishes */
  emitCustom(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }

  /** Enrich server.* payloads with serverName/blueprintId for handler convenience */
  private normalize<K extends ExtEventName>(
    event: K,
    payload: ExtEventMap[K],
  ): ExtEventMap[K] {
    // server.log fires per output line
    if (event === "server.log") return payload;
    if (event.startsWith("server.") && payload && "serverId" in payload) {
      const server = this.serversRepo.findById(payload.serverId);
      if (server) {
        return {
          ...payload,
          serverName: server.name,
          blueprintId: (server as { blueprintId?: string }).blueprintId,
        };
      }
    }
    return payload;
  }
}
