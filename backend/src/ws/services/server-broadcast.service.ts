import { Injectable, Logger } from "@nestjs/common";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import {
  WsServerEventTypes,
  WsSystemEventTypes,
  WsTelegramEventTypes,
} from "@shared/types/ws/server-events.types";
import type { WsMetricsData } from "@shared/types/ws/system.types";
import type { Server, Socket } from "socket.io";

/**
 * Holds the live socket.io Server reference and exposes typed broadcast helpers
 */
@Injectable()
export class ServerBroadcastService {
  private readonly logger = new Logger(ServerBroadcastService.name);
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  private get io(): Server {
    if (!this.server) {
      throw new Error("ServerBroadcastService: socket server not attached yet");
    }
    return this.server;
  }

  emitServerStatusUpdate(serverId: string, status: any) {
    this.io.to(`server:${serverId}`).emit(WsServerEventTypes.STATUS_UPDATE, {
      serverId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitServerQueryData(serverId: string, queryData: any) {
    this.io.to(`server:${serverId}`).emit(WsServerEventTypes.QUERY_DATA, {
      serverId,
      ...queryData,
      timestamp: new Date().toISOString(),
    });
  }

  emitServerLog(serverId: string, logEntry: IInstanceLog) {
    this.io.to(`server:${serverId}`).emit(WsServerEventTypes.LOG_UPDATE, {
      serverId,
      ...logEntry,
    });
  }

  emitServerError(serverId: string, errorData: any) {
    this.io.to(`server:${serverId}`).emit(WsServerEventTypes.ERROR_UPDATE, {
      serverId,
      ...errorData,
      timestamp: new Date().toISOString(),
    });
  }

  emitServerErrorResolved(serverId: string, errorType: string) {
    this.io.to(`server:${serverId}`).emit(WsServerEventTypes.ERROR_RESOLVED, {
      serverId,
      errorType,
      timestamp: new Date().toISOString(),
    });
  }

  emitFullLog(client: Socket, serverId: string, fullLog: IInstanceLog[]) {
    client.emit(WsServerEventTypes.FULL_LOG, {
      serverId,
      data: fullLog,
      timestamp: new Date().toISOString(),
    });
  }

  emitServersList(servers: unknown[]) {
    this.io.emit(WsServerEventTypes.LIST, servers);
  }

  emitToRoom(room: string, event: string, payload: unknown): void {
    this.io.in(room).emit(event, payload);
  }

  emitSystemMetrics(metrics: WsMetricsData) {
    this.io.emit(WsSystemEventTypes.SYSTEM_METRICS, {
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  emitOtpUpdate(otpData: {
    code: string;
    expiresAt: number;
    countdown?: number;
  }) {
    this.io.emit(WsTelegramEventTypes.OTP_UPDATE, {
      ...otpData,
      timestamp: new Date().toISOString(),
    });
  }

  emitUpdateNotification(updateData: {
    latestVersion: string;
    releaseNotes: string;
  }) {
    this.io.emit(WsSystemEventTypes.UPDATE_NOTIFICATION, {
      ...updateData,
      timestamp: new Date().toISOString(),
    });
  }
}
