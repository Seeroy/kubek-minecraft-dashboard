import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import ky from "ky";
import { machineIdSync } from "node-machine-id";
import * as os from "os";
import { getErrorMessage } from "../../core/utils/error";
import { getVersion } from "../../core/utils/updates";
import { ConfigService } from "../config/config.service";
import { SqliteProvider } from "../database/sqlite.provider";
import { RolesRepository } from "../database/repositories/roles.repository";
import { ServersRepository } from "../database/repositories/servers.repository";
import { UsersRepository } from "../database/repositories/users.repository";
import { JavaService } from "../java/java.service";
import { isInsideContainer } from "../server-types/runtime/host-paths";
import type { ClientPrefsDto } from "./dto/client-prefs.dto";

const DEFAULT_TELEMETRY_URL = "https://statscol.seeeroy.ru/save_kubek4";

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

@Injectable()
export class StatsService implements OnModuleInit {
  private readonly logger = new Logger(StatsService.name);
  // Latest interface settings per user since start, sent only as counts
  private readonly clients = new Map<string, ClientPrefsDto>();

  constructor(
    private readonly javaService: JavaService,
    private readonly serversRepository: ServersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly configService: ConfigService,
    private readonly sqlite: SqliteProvider,
  ) {}

  onModuleInit(): void {
    if (!this.isTelemetryEnabled()) return;
    // Send startup stats -> background
    void this.collectStats()
      .then((stats) => this.sendStatsToServer(stats, true))
      .catch((error: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          this.logger.warn(
            `Failed to send startup statistics: ${getErrorMessage(error)}`,
          );
        }
      });
  }

  isTelemetryEnabled(): boolean {
    if ((process.env.KUBEK_TELEMETRY ?? "").toLowerCase() === "off")
      return false;
    const config = this.configService.getAll();
    return config.telemetry?.enabled !== false;
  }

  getTelemetryUrl(): string {
    return process.env.KUBEK_TELEMETRY_URL ?? DEFAULT_TELEMETRY_URL;
  }

  rememberClient(userId: string, prefs: ClientPrefsDto): void {
    const { language, theme, colorTheme } = prefs;
    this.clients.set(userId, { language, theme, colorTheme });
  }

  private column(sql: string): string[] {
    return this.sqlite.connection
      .query(sql)
      .all()
      .map((row) => String(Object.values(row as object)[0]));
  }

  private count(sql: string): number {
    return Number(this.column(sql)[0] ?? 0);
  }

  // Which features are in use, counts and ids only
  private collectFeatures() {
    const assistant = this.configService.get("assistant") as
      { enabled?: boolean; preset?: string } | undefined;
    return {
      assistant: assistant?.enabled ? (assistant.preset ?? null) : null,
      scheduledTasks: countBy(
        this.column("SELECT action FROM scheduled_tasks WHERE enabled = 1"),
      ),
      backups: {
        policies: this.count("SELECT COUNT(*) FROM backup_policies"),
        storages: countBy(this.column("SELECT driver FROM backup_storages")),
      },
      extensions: this.count(
        "SELECT COUNT(*) FROM extensions WHERE enabled = 1",
      ),
      networks: this.count("SELECT COUNT(*) FROM networks"),
    };
  }

  private collectClients() {
    const prefs = [...this.clients.values()];
    return {
      languages: countBy(prefs.map((p) => p.language)),
      themes: countBy(prefs.map((p) => p.theme)),
      colorThemes: countBy(prefs.map((p) => p.colorTheme)),
    };
  }

  getUniqueID(): string {
    return machineIdSync();
  }

  async collectStats() {
    const id = this.getUniqueID();
    const cpuCommon = os.cpus();
    const config = this.configService.getAll();

    const installedJavas = await this.javaService.getInstalledJavaVersions();
    // Versions only, paths may contain the OS user name
    const javaVersions = installedJavas.map((java) => java.version);

    const serversCount = this.serversRepository.findAll().length;
    const usersCount = this.usersRepository.findAll().length;
    const rolesCount = this.rolesRepository.findAll().length;

    return {
      platform: {
        name: os.type(),
        release: os.release(),
        arch: process.arch,
        version: os.version(),
      },
      totalRAM: Math.round(os.totalmem() / 1024 / 1024),
      cpu: {
        model: cpuCommon[0]?.model || "Unknown",
        speed: cpuCommon[0]?.speed || 0,
        cores: cpuCommon.length,
      },
      id,
      version: getVersion(),
      javas: JSON.stringify(javaVersions),
      serversCount,
      usersCount,
      rolesCount,
      inDocker: isInsideContainer(),
      runtime: {
        bun: process.versions.bun ?? null,
        node: process.versions.node,
      },
      features: this.collectFeatures(),
      clients: this.collectClients(),
      tgbotEnabled: config.telegramBot?.enabled || false,
      ftpdEnabled: config.ftpd?.enabled || false,
      uptime: Math.round(process.uptime()),
    };
  }

  async sendStatsToServer(
    statsData: unknown,
    isOnStart: boolean,
  ): Promise<void> {
    try {
      await ky.post(this.getTelemetryUrl(), {
        json: { data: statsData, start: isOnStart },
      });
    } catch (error: unknown) {
      if (process.env.NODE_ENV !== "production") {
        this.logger.warn(
          `Failed to send statistics: ${getErrorMessage(error)}`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendStatsCron(): Promise<void> {
    if (!this.isTelemetryEnabled()) return;
    const stats = await this.collectStats();
    await this.sendStatsToServer(stats, false);
  }
}
