import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable } from "@nestjs/common";
import { IUser } from "@shared/types/user.types";
import { WsRoomEventTypes } from "@/ws/room-events.types";
import { Socket } from "socket.io";

@Injectable()
export class RoomService {
  constructor(
    private readonly instancesRegistry: InstancesRegistry,
    private readonly broadcast: ServerBroadcastService,
  ) {}

  joinUserRoom(client: Socket, userId: string) {
    client.join(this.getUserRoomName(userId));
  }

  leaveUserRoom(client: Socket, userId: string) {
    client.leave(this.getUserRoomName(userId));
  }

  getUserRoomName(userId: string): string {
    return `user:${userId}`;
  }

  async onRoomSubscribe(client: Socket, room: string) {
    if (!client.data?.user) return client.emit(WsRoomEventTypes.ROOM_REJECTED);

    const user = client.data.user as IUser;

    const roomPrefix = room.split(":")[0];
    switch (roomPrefix) {
      case "server": {
        const serverId = room.split(":")[1] || "-1";
        if (
          !user.serversRestrict.enabled ||
          user.serversRestrict.allowed.includes(serverId)
        ) {
          await client.join(room);
          client.emit(WsRoomEventTypes.ROOM_SUCCESS);

          const instance = this.instancesRegistry.getByServerId(serverId);
          if (instance && instance.pid) {
            this.broadcast.emitFullLog(client, serverId, instance.getLog());
          }
        } else {
          client.emit(WsRoomEventTypes.ROOM_REJECTED);
        }
        break;
      }
      default:
        return client.emit(WsRoomEventTypes.ROOM_REJECTED);
    }
  }

  async onRoomUnsubscribe(client: Socket, room: string) {
    if (!client.data?.user) return client.emit(WsRoomEventTypes.ROOM_REJECTED);
    await client.leave(room);
    return client.emit(WsRoomEventTypes.ROOM_SUCCESS);
  }
}
