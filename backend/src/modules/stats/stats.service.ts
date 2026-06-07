import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import ky from "ky";
import { machineIdSync } from "node-machine-id";
import * as os from "os";
import { getErrorMessage } from "../../core/utils/error";
import { getVersion } from "../../core/utils/updates";
import { ConfigService } from "../config/config.service";
import { ServersRepository } from "../database/repositories/servers.repository";
import { UsersRepository } from "../database/repositories/users.repository";
import { JavaService } from "../java/java.service";

const DEFAULT_TELEMETRY_URL = "https://statscol.seeeroy.ru/save_kubek4";

@Injectable()
export class StatsService implements OnModuleInit {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly javaService: JavaService,
    private readonly serversRepository: ServersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.isTelemetryEnabled()) return;
    const stats = await this.collectStats();
    await this.sendStatsToServer(stats, true);
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

  getUniqueID(): string {
    return machineIdSync();
  }

  async collectStats() {
    const id = this.getUniqueID();
    const cpuCommon = os.cpus();
    const config = this.configService.getAll();

    const installedJavas = await this.javaService.getInstalledJavaVersions();
    const javaPaths = installedJavas.map((java) => java.path).filter(Boolean);

    const serversCount = this.serversRepository.findAll().length;
    const usersCount = this.usersRepository.findAll().length;

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
      javas: JSON.stringify(javaPaths),
      serversCount,
      usersCount,
      tgbotEnabled: config.telegramBot?.enabled || false,
      ftpdEnabled: config.ftpd?.enabled || false,
      uptime: Math.round(process.uptime()),
    };
  }

  async getAllJavaInstalled(): Promise<string[]> {
    const installedJavas = await this.javaService.getInstalledJavaVersions();
    return installedJavas
      .map((java) => java.path)
      .filter((path): path is string => Boolean(path));
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

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendStatsCron(): Promise<void> {
    if (!this.isTelemetryEnabled()) return;
    const stats = await this.collectStats();
    await this.sendStatsToServer(stats, false);
  }
}
