import { visibleServers } from "@/core/utils/serverAccess";
import { ApiKeysService } from "@/modules/api-keys/api-keys.service";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { Injectable } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { can } from "@shared/access/can";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import type { IUser } from "@shared/types/user.types";
import type {
  WsEvent,
  WsEventPayloadMap,
} from "@shared/types/ws/event-payload-map.types";
import { consoleRoom, serverRoom } from "@shared/types/ws/room-events.types";
import {
  WsServerEventTypes,
  WsSystemEventTypes,
  WsTelegramEventTypes,
} from "@shared/types/ws/server-events.types";
import type {
  WsServerErrorInfo,
  WsServerListItem,
  WsServerQueryInfo,
  WsServerStatusChange,
} from "@shared/types/ws/server-payloads.types";
import type { WsMetricsData } from "@shared/types/ws/system.types";
import type { Server, Socket } from "socket.io";

interface Emitter {
  emit(event: string, payload: unknown): unknown;
}

/** Emit an event from WsEventPayloadMap with its payload type */
export function emitWs<E extends WsEvent>(
  target: Emitter,
  event: E,
  payload: WsEventPayloadMap[E],
): void {
  target.emit(event, payload);
}

/**
 * Holds the live socket.io Server reference and exposes typed broadcast helpers
 */
@Injectable()
export class ServerBroadcastService {
  private server: Server | null = null;

  constructor(
    private readonly users: UsersRepository,
    private readonly apiKeys: ApiKeysService,
  ) {}

  // Fresh user per socket, cut down again when it came with a key
  private socketUsers(): [Socket, IUser][] {
    const fresh = new Map<string, IUser | null>();
    const result: [Socket, IUser][] = [];
    for (const socket of this.io.sockets.sockets.values()) {
      const stored = socket.data?.user as IUser | undefined;
      if (!stored?.id) continue;
      if (!fresh.has(stored.id))
        fresh.set(stored.id, this.users.findById(stored.id));
      const user = this.apiKeys.reload(stored, fresh.get(stored.id));
      if (user) result.push([socket, user]);
    }
    return result;
  }

  attach(server: Server): void {
    this.server = server;
  }

  private get io(): Server {
    if (!this.server) {
      throw new Error("ServerBroadcastService: socket server not attached yet");
    }
    return this.server;
  }

  emitServerStatusUpdate(serverId: string, status: WsServerStatusChange) {
    emitWs(this.io.to(serverRoom(serverId)), WsServerEventTypes.STATUS_UPDATE, {
      serverId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitServerQueryData(serverId: string, queryData: WsServerQueryInfo) {
    emitWs(this.io.to(serverRoom(serverId)), WsServerEventTypes.QUERY_DATA, {
      serverId,
      ...queryData,
      timestamp: new Date().toISOString(),
    });
  }

  emitServerLog(serverId: string, logEntry: IInstanceLog) {
    emitWs(this.io.to(consoleRoom(serverId)), WsServerEventTypes.LOG_UPDATE, {
      serverId,
      ...logEntry,
    });
  }

  emitServerError(serverId: string, errorData: WsServerErrorInfo) {
    emitWs(this.io.to(serverRoom(serverId)), WsServerEventTypes.ERROR_UPDATE, {
      serverId,
      errorType: errorData.errorType,
      severity: errorData.severity,
      type: "error",
      timestamp: new Date().toISOString(),
    });
  }

  emitServerErrorResolved(serverId: string, errorType: string) {
    emitWs(
      this.io.to(serverRoom(serverId)),
      WsServerEventTypes.ERROR_RESOLVED,
      {
        serverId,
        errorType,
        timestamp: new Date().toISOString(),
      },
    );
  }

  emitFullLog(client: Socket, serverId: string, fullLog: IInstanceLog[]) {
    emitWs(client, WsServerEventTypes.FULL_LOG, {
      serverId,
      data: fullLog,
      timestamp: new Date().toISOString(),
    });
  }

  // Each socket gets only the servers its user can access. The user is read
  // again, so access changes show up without a reconnect
  emitServersList(servers: WsServerListItem[]) {
    for (const [socket, user] of this.socketUsers()) {
      emitWs(socket, WsServerEventTypes.LIST, visibleServers(user, servers));
    }
  }

  emitToRoom<E extends WsEvent>(
    room: string,
    event: E,
    payload: WsEventPayloadMap[E],
  ): void {
    emitWs(this.io.in(room), event, payload);
  }

  emitSystemMetrics(metrics: WsMetricsData) {
    const payload = { ...metrics, timestamp: new Date().toISOString() };
    for (const [socket, user] of this.socketUsers()) {
      if (can(user, AccessArea.MONITORING, "read"))
        emitWs(socket, WsSystemEventTypes.SYSTEM_METRICS, payload);
    }
  }

  // Owner only, the code links Telegram to this account
  emitOtpUpdate(
    userId: string,
    otpData: {
      code: string;
      expiresAt: number;
      countdown?: number;
    },
  ) {
    emitWs(this.io.to(`user:${userId}`), WsTelegramEventTypes.OTP_UPDATE, {
      ...otpData,
      timestamp: new Date().toISOString(),
    });
  }
}
