import { AppEventsService } from "@/core/events/app-events.service";
import { ApiErrorCode } from "@/core/errors/error-codes";
import { CompanionEventsRepository } from "@/modules/database/repositories/companion-events.repository";
import { CompanionMetricsRepository } from "@/modules/database/repositories/companion-metrics.repository";
import {
  CompanionSettingsRepository,
  type CompanionSettingsRow,
} from "@/modules/database/repositories/companion-settings.repository";
import { MetricsResolution } from "@/modules/database/repositories/metrics.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import {
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CompanionEventType,
  CompanionMaintenance,
  CompanionStats,
} from "@shared/types/companion.types";
import { COMPANION_REPO_URL } from "./companion.constants";
import { CompanionHubService } from "./companion-hub.service";
import type { CompanionMetricsWindow } from "./dto/companion-requests.dto";
import type {
  CompanionActivityDto,
  CompanionEventsPageDto,
  CompanionInstallResultDto,
  CompanionLagReportDto,
  CompanionLivePluginDto,
  CompanionMetricPointDto,
  CompanionOverviewDto,
  CompanionSettingsDto,
} from "./dto/companion-responses.dto";
import type { IUser } from "@shared/types/user.types";
import { CompanionInstallerService } from "./install/companion-installer.service";
import {
  CompanionRequestError,
  type CompanionLink,
} from "./link/companion-link";

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const WINDOWS: Record<
  CompanionMetricsWindow,
  { span: number; resolution: MetricsResolution }
> = {
  "1h": { span: HOUR, resolution: MetricsResolution.RAW },
  "6h": { span: 6 * HOUR, resolution: MetricsResolution.ONE_MINUTE },
  "24h": { span: DAY, resolution: MetricsResolution.FIVE_MINUTES },
  "7d": { span: 7 * DAY, resolution: MetricsResolution.FIVE_MINUTES },
};
const DEFAULT_KICK_MESSAGE = "&cServer is under maintenance, come back later";
// Plugin side scans are slower than a plain request
const LAG_REPORT_TIMEOUT_MS = 20_000;
const TICKS_PER_SECOND = 20;

export interface MaintenanceInput {
  enabled: boolean;
  message?: string;
  motd?: string;
  allow?: string[];
  allowOps?: boolean;
  kickOnline?: boolean;
}

/** Everything the panel does with the plugin, for the API, scheduler and assistant */
@Injectable()
export class CompanionService {
  constructor(
    private readonly hub: CompanionHubService,
    private readonly installer: CompanionInstallerService,
    private readonly instances: InstancesRegistry,
    private readonly servers: ServersRepository,
    private readonly blueprints: ServerTypesRegistry,
    private readonly settings: CompanionSettingsRepository,
    private readonly metrics: CompanionMetricsRepository,
    private readonly feed: CompanionEventsRepository,
    private readonly events: AppEventsService,
  ) {}

  /** Bukkit family, the same servers that get the plugins page */
  supports(serverId: string): boolean {
    const server = this.servers.findById(serverId);
    if (!server?.blueprintId) return false;
    const features =
      this.blueprints.get(server.blueprintId)?.manifest.features ?? [];
    return features.includes("plugins:modrinth");
  }

  isConnected(serverId: string): boolean {
    return this.hub.state(serverId).connected;
  }

  /** Players online from the plugin, null when it isn't connected */
  onlinePlayers(serverId: string): number | null {
    const state = this.hub.state(serverId);
    return state.connected && state.stats ? state.stats.online : null;
  }

  /** Last stats snapshot while the plugin is connected */
  liveStats(serverId: string): CompanionStats | null {
    const state = this.hub.state(serverId);
    return state.connected ? state.stats : null;
  }

  async overview(serverId: string): Promise<CompanionOverviewDto> {
    this.assertServer(serverId);
    const supported = this.supports(serverId);
    const [installed, latest] = await Promise.all([
      supported ? this.installer.detect(serverId) : Promise.resolve(null),
      supported ? this.installer.latest() : Promise.resolve(null),
    ]);
    const saved = this.settings.get(serverId);
    return {
      supported,
      installed,
      latest: latest
        ? {
            version: latest.version,
            url: latest.url,
            publishedAt: latest.publishedAt,
          }
        : null,
      updateAvailable:
        !!installed && this.installer.isOutdated(installed, latest),
      live: this.hub.state(serverId),
      settings: settingsOf(saved),
      maintenance: saved.maintenance,
      repoUrl: COMPANION_REPO_URL,
    };
  }

  async install(serverId: string): Promise<CompanionInstallResultDto> {
    this.assertSupported(serverId);
    const installed = await this.installer.install(serverId);
    return {
      installed,
      restartRequired:
        this.instances.getByServerId(serverId)?.isRunning() ?? false,
    };
  }

  updateSettings(
    serverId: string,
    patch: Partial<CompanionSettingsDto>,
  ): CompanionSettingsDto {
    this.assertServer(serverId);
    const saved = this.settings.update(serverId, patch);
    const link = this.instances.getByServerId(serverId)?.companion;
    if (link?.connected)
      link.push("config", { chat: saved.chat, coords: saved.coords });
    return settingsOf(saved);
  }

  /** Saved even while the plugin is offline, it gets it on the next hello */
  async setMaintenance(
    serverId: string,
    input: MaintenanceInput,
  ): Promise<CompanionMaintenance> {
    this.assertServer(serverId);
    const maintenance: CompanionMaintenance = {
      enabled: input.enabled,
      message: input.message?.trim() || DEFAULT_KICK_MESSAGE,
      motd: input.motd?.trim() || null,
      allow: [
        ...new Set((input.allow ?? []).map((a) => a.trim()).filter(Boolean)),
      ],
      allowOps: input.allowOps ?? true,
    };
    this.settings.update(serverId, { maintenance });
    const link = this.instances.getByServerId(serverId)?.companion;
    if (link?.connected) {
      await this.call(
        link.request("maintenance", {
          ...maintenance,
          kickOnline: !!input.kickOnline,
        }),
      );
    }
    return maintenance;
  }

  async broadcast(
    serverId: string,
    message: string,
    byUser?: Pick<IUser, "id" | "username">,
  ): Promise<void> {
    await this.call(this.link(serverId).request("broadcast", { message }));
    if (!byUser) return;
    this.instances.getByServerId(serverId)?.writeLog({
      type: "kubek",
      data: {
        type: "broadcast",
        id: byUser.id,
        username: byUser.username,
        message,
      },
    });
  }

  async title(
    serverId: string,
    title: string,
    subtitle = "",
    seconds = 4,
  ): Promise<void> {
    await this.call(
      this.link(serverId).request("title", {
        title,
        subtitle,
        fadeIn: 10,
        stay: seconds * TICKS_PER_SECOND,
        fadeOut: 20,
      }),
    );
  }

  async lagReport(
    serverId: string,
    limit = 10,
  ): Promise<CompanionLagReportDto> {
    return this.call(
      this.link(serverId).request<CompanionLagReportDto>(
        "lag_report",
        { limit },
        LAG_REPORT_TIMEOUT_MS,
      ),
    );
  }

  async livePlugins(serverId: string): Promise<CompanionLivePluginDto[]> {
    return this.call(
      this.link(serverId).request<CompanionLivePluginDto[]>("plugins"),
    );
  }

  /**
   * Shows a countdown in game and resolves once it ran out,
   * false when it was cancelled or the server went away meanwhile
   */
  async countdown(
    serverId: string,
    seconds: number,
    message: string,
  ): Promise<boolean> {
    const link = this.link(serverId);
    const { id, result } = link.start("countdown", {
      seconds,
      message,
      bossBar: true,
    });
    return new Promise<boolean>((resolve, reject) => {
      const stop = () => {
        clearTimeout(guard);
        unsubscribe();
      };
      const unsubscribe = this.events.on("companion.events", (payload) => {
        if (payload.serverId !== serverId) return;
        const hit = payload.events.find((e) => e.id === id);
        if (!hit) return;
        stop();
        resolve(hit.type === "countdown_done");
      });
      // The plugin may never answer if the server dies mid countdown
      const guard = setTimeout(
        () => {
          stop();
          resolve(false);
        },
        (seconds + 30) * 1000,
      );

      result.catch((e: unknown) => {
        stop();
        reject(this.toHttp(e));
      });
    });
  }

  metricsRange(
    serverId: string,
    window: CompanionMetricsWindow,
  ): CompanionMetricPointDto[] {
    this.assertServer(serverId);
    const { span, resolution } = WINDOWS[window];
    const now = Date.now();
    return this.metrics
      .range(resolution, serverId, now - span, now)
      .map((r) => ({
        ts: r.ts,
        tps: round(r.tpsAvg),
        tpsMin: round(r.tpsMin),
        mspt: round(r.msptAvg),
        msptMax: round(r.msptMax),
        heapUsed: r.heapAvg,
        heapMax: r.heapLimit,
        players: round(r.playersAvg) ?? 0,
        playersMax: r.playersMax,
      }));
  }

  eventsPage(
    serverId: string,
    query: {
      types?: CompanionEventType[];
      before?: number;
      q?: string;
      uuid?: string;
      limit?: number;
    },
  ): CompanionEventsPageDto {
    this.assertServer(serverId);
    const limit = query.limit ?? 50;
    const items = this.feed.list(serverId, { ...query, limit });
    return {
      items,
      nextBefore: items.length === limit ? items[items.length - 1].id : null,
    };
  }

  activity(serverId: string, days = 7): CompanionActivityDto {
    this.assertServer(serverId);
    const from = Date.now() - days * DAY;
    return {
      peakOnline: this.metrics.peakPlayers(serverId, from),
      top: this.feed.playtime(serverId, from, 10),
    };
  }

  private link(serverId: string): CompanionLink {
    this.assertServer(serverId);
    const link = this.instances.getByServerId(serverId)?.companion;
    if (!link?.connected) {
      throw new ConflictException({
        code: ApiErrorCode.COMPANION_NOT_CONNECTED,
        message: "Kubek Companion is not connected on this server",
      });
    }
    return link;
  }

  private async call<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (e) {
      throw this.toHttp(e);
    }
  }

  private toHttp(e: unknown): Error {
    if (!(e instanceof CompanionRequestError)) {
      return e instanceof Error ? e : new Error(String(e));
    }
    switch (e.code) {
      case "timeout":
        return new GatewayTimeoutException({
          code: ApiErrorCode.COMPANION_TIMEOUT,
          message: "Kubek Companion did not answer in time",
        });
      case "rejected":
        // The plugin builds a lag report at most once per 10 s
        if (e.message === "rate_limited") {
          return new HttpException(
            {
              code: ApiErrorCode.COMPANION_RATE_LIMITED,
              message: "Kubek Companion was asked too often, try again shortly",
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        return new BadRequestException({
          code: ApiErrorCode.COMPANION_REJECTED,
          message: `Kubek Companion refused the request: ${e.message}`,
        });
      default:
        return new ConflictException({
          code: ApiErrorCode.COMPANION_NOT_CONNECTED,
          message: "Kubek Companion is not connected on this server",
        });
    }
  }

  private assertServer(serverId: string): void {
    if (!this.servers.findById(serverId)) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }
  }

  private assertSupported(serverId: string): void {
    this.assertServer(serverId);
    if (!this.supports(serverId)) {
      throw new BadRequestException({
        code: ApiErrorCode.COMPANION_UNSUPPORTED,
        message: "This server type can't run Kubek Companion",
      });
    }
  }
}

function round(value: number | null): number | null {
  return value == null ? null : Math.round(value * 100) / 100;
}

function settingsOf(row: CompanionSettingsRow): CompanionSettingsDto {
  return {
    sessions: row.sessions,
    kicks: row.kicks,
    deaths: row.deaths,
    chat: row.chat,
    coords: row.coords,
  };
}
