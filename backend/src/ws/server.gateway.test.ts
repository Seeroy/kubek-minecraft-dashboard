import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { ServerStatus } from "@shared/types/server/server.types";
import { AccessArea, type AccessMap } from "@shared/access/areas";
import {
  type WsRoomAck,
  WsRoomEventTypes,
} from "@shared/types/ws/room-events.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { WsUserEventTypes } from "@shared/types/ws/user-events.types";
import type { AddressInfo } from "net";
import { io, type Socket as ClientSocket } from "socket.io-client";
import { AppEventsService } from "@/core/events/app-events.service";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import type { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { fake } from "@/testing/fake";
import { testUser } from "@/testing/user";
import { sqliteProvider } from "@/testing/sqlite";
import { ServerGateway } from "./server.gateway";
import { AuthService } from "./services/auth.service";
import { CommandHandlerService } from "./services/command-handler.service";
import { RoomService } from "./services/room.service";
import { ServerBroadcastService } from "./services/server-broadcast.service";
import { TerminalHandlerService } from "./services/terminal-handler.service";

const LOG: IInstanceLog[] = [
  { type: "stdout", line: "Done (1.0s)!", timestamp: "12:00:00" },
];

let app: INestApplication;
let url: string;
let gateway: ServerGateway;
let users: UsersRepository;
let sessions: SessionsService;
let events: AppEventsService;
let audit: AuditLogsRepository;
let mine: string;
let foreign: string;
let sent: string[];
const clients: ClientSocket[] = [];

function instanceOf(serverId: string): ServerInstance {
  return fake<ServerInstance>({
    serverId,
    pid: 42,
    isRunning: () => true,
    input: (command: string) => {
      sent.push(`${serverId}:${command}`);
      return true;
    },
    getLog: () => LOG,
    complete: (line: string) =>
      Promise.resolve({ completion: `${line}list`, candidates: ["list"] }),
    dispose: () => {},
  });
}

const VIEW: AccessMap = { [AccessArea.POWER]: "read" };
const CONSOLE_READ: AccessMap = { [AccessArea.CONSOLE]: "read" };
const CONSOLE_WRITE: AccessMap = { [AccessArea.CONSOLE]: "write" };

function account(id: string, grants: AccessMap): string {
  users.create(
    testUser(id, {
      grants,
      serversRestrict: { enabled: true, allowed: [mine] },
    }),
  );
  return sessions.create(id, null, null).token;
}

function connect(token?: string): ClientSocket {
  const socket = io(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
    auth: token ? { authorization: `Bearer ${token}` } : {},
  });
  clients.push(socket);
  return socket;
}

function next<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

// The server list is the first thing a client gets, so it marks a ready socket
async function ready(token: string): Promise<ClientSocket> {
  const socket = connect(token);
  await next(socket, WsServerEventTypes.LIST);
  return socket;
}

async function roomMembers(room: string): Promise<number> {
  return (await gateway.server.in(room).fetchSockets()).length;
}

function ask<T>(
  socket: ClientSocket,
  event: string,
  data: unknown,
): Promise<T> {
  return socket.timeout(2000).emitWithAck(event, data);
}

const join = (socket: ClientSocket, room: string) =>
  ask<WsRoomAck>(socket, WsRoomEventTypes.ROOM_SUBSCRIBE, room);

beforeAll(async () => {
  const sqlite = sqliteProvider();
  users = new UsersRepository(sqlite);
  const servers = new ServersRepository(sqlite);
  audit = new AuditLogsRepository(sqlite);
  events = new AppEventsService();
  sessions = new SessionsService(
    new UserSessionsRepository(sqlite),
    new AccountsService(users),
    new ExtensionEventBus(servers),
    events,
  );

  const row = (name: string) =>
    servers.create({
      name,
      status: ServerStatus.RUNNING,
      restartOnError: { enabled: false, attempts: 0 },
      folderId: null,
      blueprintId: "com.kubek.paper",
      variables: {},
      createdBy: null,
    }).id;
  mine = row("mine");
  foreign = row("foreign");

  const instances = new InstancesRegistry();
  instances.add(instanceOf(mine));
  instances.add(instanceOf(foreign));

  const moduleRef = await Test.createTestingModule({
    providers: [
      ServerGateway,
      RoomService,
      CommandHandlerService,
      TerminalHandlerService,
      ServerBroadcastService,
      { provide: AuthService, useValue: new AuthService(sessions) },
      { provide: AppEventsService, useValue: events },
      { provide: UsersRepository, useValue: users },
      { provide: ServersRepository, useValue: servers },
      { provide: InstancesRegistry, useValue: instances },
      {
        provide: AuditLogService,
        useValue: new AuditLogService(audit, servers),
      },
    ],
  }).compile();

  app = moduleRef.createNestApplication({ logger: false });
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(0, "127.0.0.1");
  const { port } = app.getHttpServer().address() as AddressInfo;
  url = `http://127.0.0.1:${port}`;
  gateway = app.get(ServerGateway);
});

beforeEach(() => {
  sent = [];
});

afterAll(async () => {
  for (const socket of clients) socket.disconnect();
  await app?.close();
});

describe("WS connection", () => {
  test("no token or a bad one gets auth failed and is dropped", async () => {
    for (const socket of [connect(), connect("nope")]) {
      await next(socket, WsUserEventTypes.AUTH_FAILED);
      await next(socket, "disconnect");
      expect(socket.connected).toBe(false);
    }
  });

  test("a revoked session can't connect", async () => {
    const token = account("revoked", VIEW);
    sessions.revokeAllForUser("revoked");

    const socket = connect(token);
    await next(socket, WsUserEventTypes.AUTH_FAILED);
  });

  test("the server list only has servers the user can access", async () => {
    const token = account("lister", VIEW);

    const socket = connect(token);
    const list = await next<{ id: string }[]>(socket, WsServerEventTypes.LIST);

    expect(list.map((s) => s.id)).toEqual([mine]);
  });
});

describe("WS console rooms", () => {
  test("a viewer joins their own server room and gets the log", async () => {
    const socket = await ready(account("viewer", CONSOLE_READ));

    const log = next<{ serverId: string }>(socket, WsServerEventTypes.FULL_LOG);
    expect(await join(socket, `server:${mine}`)).toEqual({ ok: true });

    expect((await log).serverId).toBe(mine);
    expect(await roomMembers(`server:${mine}`)).toBe(1);
    expect(await roomMembers(`console:${mine}`)).toBe(1);
    expect(
      await ask(socket, WsRoomEventTypes.ROOM_UNSUBSCRIBE, `server:${mine}`),
    ).toEqual({ ok: true });
    expect(await roomMembers(`server:${mine}`)).toBe(0);
    expect(await roomMembers(`console:${mine}`)).toBe(0);
  });

  test("a foreign server room is refused", async () => {
    const socket = await ready(account("snoop", CONSOLE_READ));

    for (const room of [
      `server:${foreign}`,
      `console:${mine}`,
      "user:admin",
      "global",
    ]) {
      expect(await join(socket, room)).toEqual({ ok: false });
    }

    expect(await roomMembers(`server:${foreign}`)).toBe(0);
    expect(await roomMembers(`console:${mine}`)).toBe(0);
    expect((await gateway.server.in("user:admin").fetchSockets()).length).toBe(
      0,
    );
  });

  test("without any access even the own server room stays closed", async () => {
    const socket = await ready(account("blind", {}));

    expect(await join(socket, `server:${mine}`)).toEqual({ ok: false });
    expect(await roomMembers(`server:${mine}`)).toBe(0);
  });

  test("power read gets the status room but not the console", async () => {
    const socket = connect(account("statusonly", VIEW));
    const list = await next<{ id: string }[]>(socket, WsServerEventTypes.LIST);
    expect(list.map((s) => s.id)).toEqual([mine]);

    expect(await join(socket, `server:${mine}`)).toEqual({ ok: true });
    expect(await roomMembers(`server:${mine}`)).toBe(1);
    expect(await roomMembers(`console:${mine}`)).toBe(0);
    socket.emit(WsRoomEventTypes.ROOM_UNSUBSCRIBE, `server:${mine}`);
    expect(
      await ask(socket, WsServerEventTypes.REQUEST_FULL_LOG, {
        serverId: mine,
      }),
    ).toEqual([]);
  });

  test("an account with no server area gets an empty server list", async () => {
    const socket = connect(
      account("panelonly", { [AccessArea.JAVA]: "manage" }),
    );
    expect(await next(socket, WsServerEventTypes.LIST)).toEqual([]);
  });

  test("the full log of a foreign server is empty", async () => {
    const socket = await ready(account("reader", CONSOLE_READ));

    expect(
      await ask(socket, WsServerEventTypes.REQUEST_FULL_LOG, {
        serverId: foreign,
      }),
    ).toEqual([]);
    expect(
      await ask(socket, WsServerEventTypes.REQUEST_FULL_LOG, {
        serverId: mine,
      }),
    ).toEqual(LOG);
  });
});

describe("WS console commands", () => {
  test("an operator sends commands to their own server only", async () => {
    const socket = await ready(account("operator", CONSOLE_WRITE));

    socket.emit(WsServerEventTypes.SUBMIT_COMMAND, {
      serverId: foreign,
      command: "op operator",
    });
    socket.emit(WsServerEventTypes.SUBMIT_COMMAND, {
      serverId: mine,
      command: "say hi",
    });
    await ask(socket, WsServerEventTypes.REQUEST_FULL_LOG, { serverId: mine });

    expect(sent).toEqual([`${mine}:say hi`]);
    expect(
      audit.query({ serverId: mine }).items.map((e) => e.details),
    ).toContainEqual({ command: "say hi" });
  });

  test("console read can't send commands or complete them", async () => {
    const socket = await ready(account("watcher", CONSOLE_READ));

    socket.emit(WsServerEventTypes.SUBMIT_COMMAND, {
      serverId: mine,
      command: "stop",
    });
    expect(
      await ask(socket, WsServerEventTypes.REQUEST_COMPLETION, {
        serverId: mine,
        line: "",
      }),
    ).toEqual({ completion: "", candidates: [] });
    expect(
      await ask(socket, WsServerEventTypes.REQUEST_FULL_LOG, {
        serverId: mine,
      }),
    ).toEqual(LOG);

    expect(sent).toEqual([]);
  });

  test("an access level taken away after connecting stops commands", async () => {
    const socket = await ready(account("demoted", CONSOLE_WRITE));
    users.update({
      ...users.findById("demoted")!,
      grants: CONSOLE_READ,
      access: { levels: CONSOLE_READ, ext: [] },
    });

    socket.emit(WsServerEventTypes.SUBMIT_COMMAND, {
      serverId: mine,
      command: "stop",
    });
    await ask(socket, WsServerEventTypes.REQUEST_FULL_LOG, { serverId: mine });

    expect(sent).toEqual([]);
  });

  test("completion works only on own servers with console write", async () => {
    const socket = await ready(account("typist", CONSOLE_WRITE));

    expect(
      await ask(socket, WsServerEventTypes.REQUEST_COMPLETION, {
        serverId: mine,
        line: "",
      }),
    ).toEqual({ completion: "list", candidates: ["list"] });
    expect(
      await ask(socket, WsServerEventTypes.REQUEST_COMPLETION, {
        serverId: foreign,
        line: "",
      }),
    ).toEqual({ completion: "", candidates: [] });
  });
});

describe("WS sockets of revoked sessions", () => {
  const closed = (socket: ClientSocket) => next<string>(socket, "disconnect");

  async function sessionOf(userId: string, socket: ClientSocket) {
    const sockets = await gateway.server.in(`user:${userId}`).fetchSockets();
    return sockets.find((s) => s.id === socket.id)!.data.session.id as string;
  }

  async function twoSessions(id: string) {
    const first = await ready(account(id, VIEW));
    const second = await ready(sessions.create(id, null, null).token);
    return { first, second };
  }

  test("revoking one session drops only its sockets", async () => {
    const { first, second } = await twoSessions("single");

    const gone = closed(second);
    sessions.revoke(await sessionOf("single", second));

    expect(await gone).toBe("io server disconnect");
    expect(first.connected).toBe(true);
  });

  test("revoking all sessions but the current one keeps that socket", async () => {
    const { first, second } = await twoSessions("others");

    const gone = closed(second);
    sessions.revokeAllForUser("others", await sessionOf("others", first));

    await gone;
    expect(first.connected).toBe(true);
    expect(await roomMembers("user:others")).toBe(1);
  });

  test("logout everywhere drops every socket of the user", async () => {
    const { first, second } = await twoSessions("everywhere");
    const gone = Promise.all([closed(first), closed(second)]);

    sessions.revokeAllForUser("everywhere");

    await gone;
    expect(await roomMembers("user:everywhere")).toBe(0);
  });

  test("an access change drops the sockets so rooms are joined again", async () => {
    const socket = await ready(account("regranted", CONSOLE_READ));
    expect(await join(socket, `server:${mine}`)).toEqual({ ok: true });
    const other = await ready(account("bystander", CONSOLE_READ));

    const gone = closed(socket);
    events.emit("user.access_changed", { userId: "regranted" });

    await gone;
    expect(await roomMembers(`console:${mine}`)).toBe(0);
    expect(other.connected).toBe(true);
  });

  test("a deleted user loses its sockets", async () => {
    const socket = await ready(account("removed", VIEW));

    const gone = closed(socket);
    events.emit("user.deleted", { userId: "removed" });

    expect(await gone).toBe("io server disconnect");
  });
});
