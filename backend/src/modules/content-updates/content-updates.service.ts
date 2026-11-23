import { AppEventsService } from "@/core/events/app-events.service";
import { getErrorMessage } from "@/core/utils/error";
import { ConfigService } from "@/modules/config/config.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ContentUpdate } from "@/modules/modrinth/installed-content-reader";
import { ModsService } from "@/modules/mods/mods.service";
import type { ModrinthContentService } from "@/modules/plugins/modrinth-content.service";
import { PluginsService } from "@/modules/plugins/plugins.service";
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { IServer } from "@shared/types/server/server.types";

// Startup is busy enough, the first pass waits a while
const FIRST_CHECK_DELAY_MS = 10 * 60_000;
// Modrinth allows 300 requests a minute, one every 2s stays far below
export const REQUEST_PAUSE_MS = 2_000;
const NOTIFIED_KEY = "contentUpdatesNotified";
const NOTIFY_NAMES = 3;

type ContentKind = "plugins" | "mods";

/** Builds already notified about, by "serverId:kind" */
type NotifiedMap = Record<string, string[]>;

const buildKey = (update: ContentUpdate) =>
  `${update.projectId}@${update.latestVersionId}`;

/** Background plugin and mod update check, one notification per new build */
@Injectable()
export class ContentUpdatesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContentUpdatesService.name);
  private running = false;

  constructor(
    private readonly servers: ServersRepository,
    private readonly plugins: PluginsService,
    private readonly mods: ModsService,
    private readonly config: ConfigService,
    private readonly events: AppEventsService,
  ) {}

  onApplicationBootstrap(): void {
    setTimeout(() => void this.checkAll(), FIRST_CHECK_DELAY_MS).unref();
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async checkAll(): Promise<void> {
    // A big pass can outlive the interval, never run two at once
    if (this.running) return;
    this.running = true;
    try {
      const previous: NotifiedMap = this.config.get(NOTIFIED_KEY) ?? {};
      const next: NotifiedMap = {};
      const engines: [ContentKind, ModrinthContentService][] = [
        ["plugins", this.plugins],
        ["mods", this.mods],
      ];
      for (const server of this.servers.findAll()) {
        for (const [kind, engine] of engines) {
          const key = `${server.id}:${kind}`;
          try {
            const updates = await engine.checkUpdates(
              server.id,
              REQUEST_PAUSE_MS,
            );
            next[key] = updates.map(buildKey);
            this.notifyNew(server, kind, updates, previous[key] ?? []);
          } catch (error) {
            // Keep what was known, a Modrinth hiccup is not "no updates"
            if (previous[key]) next[key] = previous[key];
            this.logger.debug(
              `Update check of ${kind} on ${server.id} failed: ${getErrorMessage(error)}`,
            );
          }
        }
      }
      this.config.set(NOTIFIED_KEY, next);
    } finally {
      this.running = false;
    }
  }

  private notifyNew(
    server: IServer,
    kind: ContentKind,
    updates: ContentUpdate[],
    notified: string[],
  ): void {
    const seen = new Set(notified);
    if (!updates.some((update) => !seen.has(buildKey(update)))) return;
    this.events.emit("content.updates_available", {
      serverId: server.id,
      serverName: server.name,
      kind,
      count: updates.length,
      names: updates
        .map((update) => update.title)
        .filter((title): title is string => !!title)
        .slice(0, NOTIFY_NAMES),
    });
  }
}
