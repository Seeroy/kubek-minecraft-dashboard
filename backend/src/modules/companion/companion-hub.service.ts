import { AppEventsService } from "@/core/events/app-events.service";
import { CompanionEventsRepository } from "@/modules/database/repositories/companion-events.repository";
import { CompanionMetricsRepository } from "@/modules/database/repositories/companion-metrics.repository";
import {
  CompanionSettingsRepository,
  type CompanionFeedSettings,
} from "@/modules/database/repositories/companion-settings.repository";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable, Logger } from "@nestjs/common";
import type {
  CompanionEvent,
  CompanionHello,
  CompanionLiveState,
  CompanionStats,
} from "@shared/types/companion.types";
import { serverRoom } from "@shared/types/ws/room-events.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { COMPANION_INTERVAL_SEC } from "./companion.constants";
import type { CompanionHub, CompanionPush } from "./link/companion-link";

// Which setting lets an event into the feed. Countdown events are for whoever
// waits on them and never stored
const FEED_SETTING: Partial<
  Record<CompanionEvent["type"], keyof CompanionFeedSettings>
> = {
  join: "sessions",
  quit: "sessions",
  kick: "kicks",
  death: "deaths",
  chat: "chat",
};

const OFFLINE: CompanionLiveState = {
  connected: false,
  hello: null,
  stats: null,
  lastSeen: null,
};

/**
 * Receives everything the plugins send: keeps the live state, stores metrics
 * and the feed, tells the browser and the rest of the panel
 */
@Injectable()
export class CompanionHubService implements CompanionHub {
  private readonly logger = new Logger(CompanionHubService.name);
  private readonly states = new Map<string, CompanionLiveState>();

  constructor(
    private readonly settings: CompanionSettingsRepository,
    private readonly metrics: CompanionMetricsRepository,
    private readonly feed: CompanionEventsRepository,
    private readonly broadcast: ServerBroadcastService,
    private readonly appEvents: AppEventsService,
  ) {}

  state(serverId: string): CompanionLiveState {
    return this.states.get(serverId) ?? OFFLINE;
  }

  connected(serverId: string, hello: CompanionHello): CompanionPush[] {
    this.update(serverId, {
      connected: true,
      hello,
      stats: this.state(serverId).stats,
    });

    // Nothing is stored in the plugin, so it gets its settings every time
    const saved = this.settings.get(serverId);
    const pushes: CompanionPush[] = [
      {
        type: "config",
        fields: {
          intervalSec: COMPANION_INTERVAL_SEC,
          chat: saved.chat,
          coords: saved.coords,
        },
      },
    ];
    if (saved.maintenance?.enabled) {
      pushes.push({ type: "maintenance", fields: { ...saved.maintenance } });
    }
    return pushes;
  }

  stats(serverId: string, stats: CompanionStats): void {
    const current = this.state(serverId);
    this.update(serverId, { ...current, connected: true, stats });
    try {
      this.metrics.insert({
        serverId,
        ts: stats.ts,
        tps: stats.tps?.[0] ?? null,
        mspt: stats.mspt?.avg ?? null,
        heapUsed: stats.jvm.heapUsed,
        heapMax: stats.jvm.heapMax,
        players: stats.online,
      });
    } catch (e) {
      this.logger.warn(`Could not store companion metrics: ${String(e)}`);
    }
    this.appEvents.emit("companion.stats", { serverId, stats });
  }

  events(serverId: string, events: CompanionEvent[]): void {
    const saved = this.settings.get(serverId);
    const forFeed = events.filter((e) => {
      const setting = FEED_SETTING[e.type];
      return setting !== undefined && saved[setting];
    });
    try {
      this.feed.insertMany(serverId, forFeed);
    } catch (e) {
      this.logger.warn(`Could not store companion events: ${String(e)}`);
    }
    this.appEvents.emit("companion.events", { serverId, events });
  }

  disconnected(serverId: string): void {
    if (!this.states.has(serverId)) return;
    this.states.delete(serverId);
    this.push(serverId, OFFLINE);
  }

  private update(serverId: string, next: Omit<CompanionLiveState, "lastSeen">) {
    const state = { ...next, lastSeen: Date.now() };
    this.states.set(serverId, state);
    this.push(serverId, state);
  }

  private push(serverId: string, state: CompanionLiveState): void {
    try {
      this.broadcast.emitToRoom(
        serverRoom(serverId),
        WsServerEventTypes.COMPANION,
        {
          serverId,
          ...state,
        },
      );
    } catch {
      // socket server is not up yet during boot
    }
  }
}
