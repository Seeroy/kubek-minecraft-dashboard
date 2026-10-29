import { AppEventsService } from "@/core/events/app-events.service";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { visibleServers } from "@/core/utils/serverAccess";
import { getErrorMessage } from "@/core/utils/error";
import { extractClientIp } from "@/core/utils/request";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {
  type WsRoomAck,
  WsRoomEventTypes,
} from "@shared/types/ws/room-events.types";
import {
  WsServerEventTypes,
  WsSystemEventTypes,
} from "@shared/types/ws/server-events.types";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import { WsUserEventTypes } from "@shared/types/ws/user-events.types";
import os from "os";
import osutils from "os-utils";
import { Server, Socket } from "socket.io";
import { toServerListItem } from "./server-list";
import { AuthService } from "./services/auth.service";
import { CommandHandlerService } from "./services/command-handler.service";
import { RoomService } from "./services/room.service";
import {
  emitWs,
  ServerBroadcastService,
} from "./services/server-broadcast.service";
import { TerminalHandlerService } from "./services/terminal-handler.service";

@WebSocketGateway({
  cors: { origin: "*" },
  credentials: true,
})
export class ServerGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ServerGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly roomService: RoomService,
    private readonly serversRepo: ServersRepository,
    private readonly usersRepo: UsersRepository,
    private readonly broadcast: ServerBroadcastService,
    private readonly commandHandler: CommandHandlerService,
    private readonly terminalHandler: TerminalHandlerService,
    private readonly events: AppEventsService,
  ) {}

  afterInit(server: Server) {
    this.broadcast.attach(server);

    // The session is checked only at handshake, so revoked ones are cut here
    this.events.on("session.revoked", ({ userId, sessionId }) =>
      this.dropSockets(userId, (id) => id === sessionId),
    );
    this.events.on("user.sessions_revoked", ({ userId, exceptSessionId }) =>
      this.dropSockets(userId, (id) => id !== exceptSessionId),
    );
    // Rooms were joined with the old access, the client reconnects with fresh checks
    this.events.on("user.access_changed", ({ userId }) =>
      this.dropSockets(userId),
    );
    this.events.on("user.deleted", ({ userId }) => this.dropSockets(userId));
  }

  private async dropSockets(
    userId: string,
    bySession?: (sessionId: string | undefined) => boolean,
  ): Promise<void> {
    const room = this.server.in(this.roomService.getUserRoomName(userId));
    if (!bySession) {
      room.disconnectSockets(true);
      return;
    }
    for (const socket of await room.fetchSockets()) {
      const session = socket.data.session as IUserSession | undefined;
      if (bySession(session?.id)) socket.disconnect(true);
    }
  }

  async handleConnection(client: Socket) {
    try {
      const { user, session } = this.authService.authenticateClient(client);
      client.data.user = user;
      client.data.session = session;

      this.roomService.joinUserRoom(client, user.id);
      await client.join("global");

      // Send the server list first
      const servers = this.serversRepo.findAll().map(toServerListItem);
      emitWs(client, WsServerEventTypes.LIST, visibleServers(user, servers));

      osutils.cpuUsage((cpu) => {
        if (client.disconnected) return;
        emitWs(client, WsSystemEventTypes.SYSTEM_METRICS, {
          cpu: Math.round(cpu * 100),
          memory: { total: os.totalmem(), free: os.freemem() },
        });
      });

      this.logger.log(
        `Client connected: ${client.id} (user: ${user.username})`,
      );
    } catch (error: unknown) {
      emitWs(client, WsUserEventTypes.AUTH_FAILED, getErrorMessage(error));
      client.disconnect(true);
      this.logger.warn(
        `Unauthorized connection attempt from ${client.id}: ${getErrorMessage(error)}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    const username = client.data.user?.username;
    this.logger.log(
      `Client disconnected: ${client.id} (user: ${username || "unknown"})`,
    );
  }

  // Fresh copy from the database, the socket keeps the user from connect time
  private currentUser(client: Socket): IUser | undefined {
    const id = (client.data.user as IUser | undefined)?.id;
    return (id && this.usersRepo.findById(id)) || undefined;
  }

  @SubscribeMessage(WsRoomEventTypes.ROOM_SUBSCRIBE)
  onSubscribe(client: Socket, room: string): Promise<WsRoomAck> {
    return this.roomService.onRoomSubscribe(client, room);
  }

  @SubscribeMessage(WsRoomEventTypes.ROOM_UNSUBSCRIBE)
  onUnsubscribe(client: Socket, room: string): Promise<WsRoomAck> {
    return this.roomService.onRoomUnsubscribe(client, room);
  }

  @SubscribeMessage(WsServerEventTypes.SUBMIT_COMMAND)
  onServerCommandSubmit(
    client: Socket,
    data: { serverId: string; command: string },
  ) {
    this.commandHandler.submit(
      this.currentUser(client),
      data.serverId,
      data.command,
      {
        ip: extractClientIp(client.request),
        userAgent: client.handshake.headers["user-agent"] ?? null,
      },
    );
  }

  @SubscribeMessage(WsServerEventTypes.REQUEST_FULL_LOG)
  onClientRequestFullLog(client: Socket, data: { serverId: string }) {
    return this.commandHandler.fetchFullLog(
      this.currentUser(client),
      data.serverId,
    );
  }

  @SubscribeMessage(WsServerEventTypes.REQUEST_COMPLETION)
  onClientRequestCompletion(
    client: Socket,
    data: { serverId: string; line: string },
  ) {
    return this.terminalHandler.complete(
      this.currentUser(client),
      data.serverId,
      data.line,
    );
  }
}
