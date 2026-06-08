import { getErrorMessage } from "@/core/utils/error";
import { toPublicUser } from "@/core/utils/publicUser";
import { Startup } from "@/core/utils/startup";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { forwardRef, Inject, Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { WsRoomEventTypes } from "@/ws/room-events.types";
import {
  WsServerEventTypes,
  WsSystemEventTypes,
} from "@shared/types/ws/server-events.types";
import { WsUserEventTypes } from "@shared/types/ws/user-events.types";
import os from "os";
import osutils from "os-utils";
import { Server, Socket } from "socket.io";
import { AuthService } from "./services/auth.service";
import { CommandHandlerService } from "./services/command-handler.service";
import { RoomService } from "./services/room.service";
import { ServerBroadcastService } from "./services/server-broadcast.service";

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
    @Inject(forwardRef(() => RoomService))
    private readonly roomService: RoomService,
    private readonly serversRepo: ServersRepository,
    private readonly broadcast: ServerBroadcastService,
    private readonly commandHandler: CommandHandlerService,
  ) {}

  afterInit(server: Server) {
    this.broadcast.attach(server);
  }

  async handleConnection(client: Socket) {
    try {
      const { user, session } = this.authService.authenticateClient(client);
      client.data.user = user;
      client.data.session = session;

      client.emit(WsUserEventTypes.AUTH_SUCCESS);

      this.roomService.joinUserRoom(client, user.id);
      await client.join("global");

      client.emit(WsUserEventTypes.PROFILE, toPublicUser(user));

      // Send the server list first
      let servers = this.serversRepo.findAll().map((server) => ({
        id: server.id,
        name: server.name,
        status: server.status,
        folderId: server.folderId ?? null,
        blueprintId: server.blueprintId,
        variables: server.variables,
      }));
      if (user.serversRestrict?.enabled) {
        servers = servers.filter((s) =>
          user.serversRestrict.allowed.includes(s.id),
        );
      }
      client.emit(WsServerEventTypes.LIST, servers);

      osutils.cpuUsage((cpu) => {
        if (client.disconnected) return;
        client.emit(WsSystemEventTypes.SYSTEM_METRICS, {
          cpu: Math.round(cpu * 100),
          memory: { total: os.totalmem(), free: os.freemem() },
        });
      });

      if (Startup.latestUpdate?.updateAvailable) {
        client.emit(WsSystemEventTypes.UPDATE_NOTIFICATION, {
          latestVersion: Startup.latestUpdate.latestVersion,
          releaseNotes: Startup.latestUpdate.releaseNotes || "",
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.log(
        `Client connected: ${client.id} (user: ${user.username})`,
      );
    } catch (error: unknown) {
      client.emit(WsUserEventTypes.AUTH_FAILED, getErrorMessage(error));
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

  @SubscribeMessage(WsRoomEventTypes.ROOM_SUBSCRIBE)
  async onSubscribe(client: Socket, room: string) {
    await this.roomService.onRoomSubscribe(client, room);
  }

  @SubscribeMessage(WsRoomEventTypes.ROOM_UNSUBCRIBE)
  async onUnsubscribe(client: Socket, room: string) {
    await this.roomService.onRoomUnsubscribe(client, room);
  }

  @SubscribeMessage(WsServerEventTypes.SUBMIT_COMMAND)
  onServerCommandSubmit(
    client: Socket,
    data: { serverId: string; command: string },
  ) {
    this.commandHandler.submit(client.data.user, data.serverId, data.command);
  }

  @SubscribeMessage(WsServerEventTypes.REQUEST_FULL_LOG)
  onClientRequestFullLog(client: Socket, data: { serverId: string }) {
    return this.commandHandler.fetchFullLog(client.data.user, data.serverId);
  }
}
