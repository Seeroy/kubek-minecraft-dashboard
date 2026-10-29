import { describe, expect, test } from "bun:test";
import type { UsersRepository } from "@/modules/database/repositories/users.repository";
import type { InstancesRegistry } from "@/modules/instances/instances.registry";
import { WsTelegramEventTypes } from "@shared/types/ws/server-events.types";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import type { Server, Socket } from "socket.io";
import { fake } from "@/testing/fake";
import { userWith } from "@/testing/user";
import { RoomService } from "./room.service";
import { ServerBroadcastService } from "./server-broadcast.service";

const user = (over: Partial<IUser> = {}): IUser =>
  userWith(
    { [AccessArea.CONSOLE]: "read" },
    {
      id: "u1",
      serversRestrict: { enabled: true, allowed: ["mine"] },
      ...over,
    },
  );

const noAccess = { access: { levels: {}, ext: [] } };

function fakeClient(stored: IUser) {
  const joined: string[] = [];
  const client = fake<Socket>({
    data: { user: stored },
    join: (room) => {
      joined.push(String(room));
      return Promise.resolve();
    },
    emit: () => true,
  });
  return { client, joined };
}

function service(fresh: IUser) {
  const users = fake<UsersRepository>({ findById: () => fresh });
  const instances = fake<InstancesRegistry>({ getByServerId: () => null });
  const broadcast = fake<ServerBroadcastService>();
  return new RoomService(instances, broadcast, users);
}

describe("RoomService server rooms", () => {
  test("console read on an allowed server lets a socket in", async () => {
    const u = user();
    const { client, joined } = fakeClient(u);
    expect(await service(u).onRoomSubscribe(client, "server:mine")).toEqual({
      ok: true,
    });
    expect(joined).toEqual(["server:mine", "console:mine"]);
  });

  test("other server areas get status but not the console", async () => {
    const u = user({
      access: {
        levels: { [AccessArea.FILES]: "manage", [AccessArea.POWER]: "manage" },
        ext: [],
      },
    });
    const { client, joined } = fakeClient(u);
    expect(await service(u).onRoomSubscribe(client, "server:mine")).toEqual({
      ok: true,
    });
    expect(joined).toEqual(["server:mine"]);
  });

  test("access is read fresh, not from connect time", async () => {
    const atConnect = user();
    const now = user(noAccess);
    const { client, joined } = fakeClient(atConnect);
    await service(now).onRoomSubscribe(client, "server:mine");
    expect(joined).toEqual([]);
  });

  test("foreign server and other prefixes are refused", async () => {
    const u = user();
    const { client, joined } = fakeClient(u);
    expect(await service(u).onRoomSubscribe(client, "server:foreign")).toEqual({
      ok: false,
    });
    expect(await service(u).onRoomSubscribe(client, "user:someone")).toEqual({
      ok: false,
    });
    expect(joined).toEqual([]);
  });

  test("admins pass without any level", async () => {
    const u = user({ isAdmin: true, ...noAccess });
    const { client, joined } = fakeClient(u);
    await service(u).onRoomSubscribe(client, "server:any");
    expect(joined).toEqual(["server:any", "console:any"]);
  });
});

describe("OTP updates", () => {
  test("go to the owner's room only", () => {
    const rooms: string[] = [];
    const io = fake<Server>({
      to: (room) => {
        rooms.push(String(room));
        return fake<ReturnType<Server["to"]>>({
          emit: (event: string) => {
            expect(event).toBe(WsTelegramEventTypes.OTP_UPDATE);
            return true;
          },
        });
      },
      emit: () => {
        throw new Error("broadcast to everyone");
      },
    });
    const broadcast = new ServerBroadcastService(fake<UsersRepository>());
    broadcast.attach(io);
    broadcast.emitOtpUpdate("u1", { code: "123456", expiresAt: 1 });
    expect(rooms).toEqual(["user:u1"]);
  });
});
