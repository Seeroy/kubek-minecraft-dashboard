import { AppEventsService } from "@/core/events/app-events.service";
import { getErrorMessage } from "@/core/utils/error";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type {
  ExtEventMap,
  ExtEventName,
  Unsubscribe,
} from "@kubekpanel/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";
import type { CompanionEvent } from "@shared/types/companion.types";

type Handler = (payload: any) => unknown;

interface Listener {
  handler: Handler;
  /** Extension that subscribed, for the log when its handler fails */
  owner?: string;
}

/**
 * Normalized event stream extensions subscribe to. The core publishes here from the single places
 * that already own each event; extensions never publish
 * core events. Capability gating happens in the extension context layer, not here
 */
@Injectable()
export class ExtensionEventBus {
  private readonly logger = new Logger(ExtensionEventBus.name);
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(
    private readonly serversRepo: ServersRepository,
    events?: AppEventsService,
  ) {
    // The server row is gone by now, nothing to normalize
    events?.on("server.deleted", ({ serverId }) => {
      this.dispatch("server.deleted", { serverId });
    });
    events?.on("companion.events", ({ serverId, events: list }) =>
      this.publishPlayers(serverId, list),
    );
  }

  publish<K extends ExtEventName>(event: K, payload: ExtEventMap[K]): void {
    if (!this.listeners.get(event)?.size) return;
    // The publisher is core code, nothing here may throw back into it
    try {
      this.dispatch(event, this.normalize(event, payload));
    } catch (err) {
      this.logger.warn(`Publishing ${event} failed: ${getErrorMessage(err)}`);
    }
  }

  on<K extends ExtEventName>(
    event: K,
    handler: (payload: ExtEventMap[K]) => void,
    owner?: string,
  ): Unsubscribe {
    return this.subscribe(event, handler, owner);
  }

  /** Custom ext.* events extensions publish to each other */
  onCustom(
    event: string,
    handler: (payload: unknown) => void,
    owner?: string,
  ): Unsubscribe {
    return this.subscribe(event, handler, owner);
  }

  emitCustom(event: string, payload: unknown): void {
    this.dispatch(event, payload);
  }

  private subscribe(event: string, handler: Handler, owner?: string): Unsubscribe {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const listener: Listener = { handler, owner };
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  // Detached like AppEventsService, a slow or throwing handler stays away from the publisher
  private dispatch(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      queueMicrotask(() => void this.run(event, listener, payload));
    }
  }

  private async run(event: string, listener: Listener, payload: unknown): Promise<void> {
    try {
      await listener.handler(payload);
    } catch (err) {
      const who = listener.owner ? ` of "${listener.owner}"` : "";
      this.logger.warn(`Handler${who} for ${event} failed: ${getErrorMessage(err)}`);
    }
  }

  private publishPlayers(serverId: string, list: CompanionEvent[]): void {
    for (const e of list) {
      const player = e.name ?? e.uuid;
      if (!player) continue;
      if (e.type === "join") this.publish("player.joined", { serverId, player });
      // A kick also sends quit, so quit alone covers every leave
      else if (e.type === "quit") this.publish("player.left", { serverId, player });
    }
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
        const blueprintId = (server as { blueprintId?: string }).blueprintId;
        return {
          ...payload,
          serverName: server.name,
          ...(blueprintId ? { blueprintId } : {}),
        };
      }
    }
    return payload;
  }
}
