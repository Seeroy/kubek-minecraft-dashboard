import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { canOnServer, canSeeServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import {
  consoleRoom,
  type WsRoomAck,
} from "@shared/types/ws/room-events.types";
import { Socket } from "socket.io";

// The console log goes to its own room, status and query reach anyone who sees the server
export function canReadConsole(
  user: IUser | null | undefined,
  serverId: string,
): boolean {
  return canOnServer(user, AccessArea.CONSOLE, "read", serverId);
}

@Injectable()
export class RoomService {
  constructor(
    private readonly instancesRegistry: InstancesRegistry,
    private readonly broadcast: ServerBroadcastService,
    private readonly users: UsersRepository,
  ) {}

  joinUserRoom(client: Socket, userId: string) {
    client.join(this.getUserRoomName(userId));
  }

  getUserRoomName(userId: string): string {
    return `user:${userId}`;
  }

  async onRoomSubscribe(client: Socket, room: string): Promise<WsRoomAck> {
    if (!client.data?.user) return { ok: false };

    const user = this.users.findById((client.data.user as IUser).id);

    // Clients can only join server rooms
    const [prefix, id] = room.split(":");
    const serverId = id || "-1";
    if (prefix !== "server" || !canSeeServer(user, serverId)) {
      return { ok: false };
    }

    await client.join(room);
    if (!canReadConsole(user, serverId)) return { ok: true };

    await client.join(consoleRoom(serverId));
    const instance = this.instancesRegistry.getByServerId(serverId);
    if (instance && instance.pid) {
      this.broadcast.emitFullLog(client, serverId, instance.getLog());
    }
    return { ok: true };
  }

  async onRoomUnsubscribe(client: Socket, room: string): Promise<WsRoomAck> {
    if (!client.data?.user) return { ok: false };
    await client.leave(room);
    const [prefix, id] = room.split(":");
    if (prefix === "server" && id) await client.leave(consoleRoom(id));
    return { ok: true };
  }
}
