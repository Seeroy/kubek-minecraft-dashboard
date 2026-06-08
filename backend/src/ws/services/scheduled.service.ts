import { OtpCodesRepository } from "@/modules/database/repositories/otp-codes.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { KubekService } from "@/modules/kubek/kubek.service";
import { SystemMonitoringService } from "@/modules/system-monitoring/system-monitoring.service";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ServerStatus } from "@shared/types/server/server.types";

interface ResponsivenessState {
  // Did the server answer Query at least once this run?
  hasResponded: boolean;
  // Consecutive failed queries since the last success
  failures: number;
  // Whether the unresponsive alert is currently active
  flagged: boolean;
}

@Injectable()
export class WsScheduledService {
  // Per running server hang-detection state, keyed by serverId
  private readonly responsiveness = new Map<string, ResponsivenessState>();
  private static readonly UNREACHABLE_THRESHOLD = 3;

  constructor(
    private readonly broadcast: ServerBroadcastService,
    private readonly serversRepo: ServersRepository,
    private readonly kubek: KubekService,
    private readonly instancesRegistry: InstancesRegistry,
    private readonly otpCodesRepo: OtpCodesRepository,
    private readonly systemMonitoringService: SystemMonitoringService,
    private readonly serverEvents: ServerEventsService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async emitMetrics() {
    const metrics = await this.systemMonitoringService.getResourcesUsage();
    this.broadcast.emitSystemMetrics(metrics);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  broadcastServersList() {
    const servers = this.serversRepo.findAll().map((server) => ({
      id: server.id,
      name: server.name,
      status: server.status,
      folderId: server.folderId ?? null,
      blueprintId: server.blueprintId,
      variables: server.variables,
    }));
    this.broadcast.emitServersList(servers);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async queryRunningServers() {
    const instances = this.instancesRegistry.findAll();
    for (const instance of instances) {
      if (!instance.pid) continue;
      let reachable = false;
      try {
        reachable = !!(await instance.queryServer());
      } catch {
        reachable = false;
      }
      this.checkResponsiveness(instance, reachable);
    }
  }

  /**
   * Detect a hung server: process alive (RUNNING) but query stops responding
   */
  private checkResponsiveness(instance: ServerInstance, reachable: boolean) {
    const serverId = instance.serverId;
    const status = this.serversRepo.findById(serverId)?.status;

    // Only running servers are tracked
    if (status !== ServerStatus.RUNNING) {
      this.responsiveness.delete(serverId);
      return;
    }

    let state = this.responsiveness.get(serverId);
    if (!state) {
      state = { hasResponded: false, failures: 0, flagged: false };
      this.responsiveness.set(serverId, state);
    }

    if (reachable) {
      state.hasResponded = true;
      state.failures = 0;
      // Server recovered -> clear the previously raised alert
      if (state.flagged) {
        state.flagged = false;
        instance.clearDiagnostic("server_unresponsive");
        this.serverEvents.emitServerErrorResolved(
          serverId,
          "server_unresponsive",
        );
      }
      return;
    }

    // Unreachable, but never answered yet = still booting up
    if (!state.hasResponded) return;

    state.failures += 1;
    if (
      state.failures >= WsScheduledService.UNREACHABLE_THRESHOLD &&
      !state.flagged
    ) {
      state.flagged = true;
      instance.recordDiagnostic({
        errorType: "server_unresponsive",
        severity: "high",
        timestamp: new Date().toISOString(),
      });
      this.serverEvents.emitServerError(serverId, {
        type: "error",
        errorType: "server_unresponsive",
        severity: "high",
      });
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  broadcastOtpCountdown() {
    const now = Date.now();
    const activeOtps = this.otpCodesRepo
      .findAll()
      .filter((otp) => !otp.used && otp.expiresAt > now);

    if (activeOtps.length === 0) return;

    const latestOtp = activeOtps.sort((a, b) => b.createdAt - a.createdAt)[0];
    const timeLeft = Math.max(0, Math.ceil((latestOtp.expiresAt - now) / 1000));

    this.broadcast.emitOtpUpdate({
      code: "",
      expiresAt: latestOtp.expiresAt,
      countdown: timeLeft,
    });
  }
}
