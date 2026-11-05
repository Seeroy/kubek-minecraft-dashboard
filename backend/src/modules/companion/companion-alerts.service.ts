import { AppEventsService } from "@/core/events/app-events.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

// 1m TPS under this for a few snapshots in a row is worth a notification
export const LOW_TPS = 15;
// Back above this counts as recovered, the gap stops flapping alerts
export const RECOVERED_TPS = 18;
const LOW_SNAPSHOTS = 4;

interface Watch {
  low: number;
  alerted: boolean;
}

/** Watches stats and raises server.low_tps once per bad stretch */
@Injectable()
export class CompanionAlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly watches = new Map<string, Watch>();
  private readonly unsubscribe: (() => void)[] = [];

  constructor(
    private readonly events: AppEventsService,
    private readonly servers: ServersRepository,
  ) {}

  onModuleInit(): void {
    this.unsubscribe.push(
      this.events.on("companion.stats", ({ serverId, stats }) => {
        const tps = stats.tps?.[0];
        if (tps != null) this.check(serverId, tps);
      }),
      this.events.on("server.deleted", ({ serverId }) => {
        this.watches.delete(serverId);
      }),
    );
  }

  onModuleDestroy(): void {
    for (const off of this.unsubscribe) off();
  }

  check(serverId: string, tps: number): void {
    const watch = this.watches.get(serverId) ?? { low: 0, alerted: false };
    this.watches.set(serverId, watch);

    if (tps >= RECOVERED_TPS) {
      watch.low = 0;
      watch.alerted = false;
      return;
    }
    if (tps >= LOW_TPS) return;

    watch.low++;
    if (watch.alerted || watch.low < LOW_SNAPSHOTS) return;
    watch.alerted = true;
    const server = this.servers.findById(serverId);
    if (!server) return;
    this.events.emit("server.low_tps", {
      serverId,
      serverName: server.name,
      tps,
    });
  }
}
