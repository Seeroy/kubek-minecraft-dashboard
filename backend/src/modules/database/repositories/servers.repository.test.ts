import { beforeEach, describe, expect, test } from "bun:test";
import { testUser } from "@/testing/user";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import {
  ScheduleMode,
  SchedulerActionType,
} from "@shared/types/scheduler.types";
import type { IUser } from "@shared/types/user.types";
import { ScheduledTasksRepository } from "./scheduled-tasks.repository";
import { ServerFoldersRepository } from "./server-folders.repository";
import { ServersRepository } from "./servers.repository";
import { UsersRepository } from "./users.repository";

let servers: ServersRepository;
let users: UsersRepository;
let folders: ServerFoldersRepository;
let tasks: ScheduledTasksRepository;

const serverInput = (
  name: string,
  extra: Partial<Omit<IServer, "id">> = {},
): Omit<IServer, "id"> => ({
  name,
  status: ServerStatus.STOPPED,
  restartOnError: { enabled: false, attempts: 3 },
  blueprintId: "paper",
  variables: {},
  ...extra,
});

const user = (id: string): IUser => testUser(id);

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  servers = new ServersRepository(provider);
  users = new UsersRepository(provider);
  folders = new ServerFoldersRepository(provider);
  tasks = new ScheduledTasksRepository(provider);
});

describe("ServersRepository", () => {
  test("a created server reads back with every field mapped", () => {
    users.create(user("alice"));
    const folder = folders.create({ name: "Survival" });

    const created = servers.create(
      serverInput("Lobby", {
        status: ServerStatus.RUNNING,
        restartOnError: { enabled: true, attempts: 5 },
        folderId: folder.id,
        blueprintVersion: "1.21.4",
        variables: { memory: 4096, motd: "hi", onlineMode: false },
        runtimeKind: "docker",
        createdBy: "alice",
      }),
    );

    expect(servers.findById(created.id)).toEqual({
      id: created.id,
      name: "Lobby",
      status: ServerStatus.RUNNING,
      restartOnError: { enabled: true, attempts: 5 },
      folderId: folder.id,
      blueprintId: "paper",
      blueprintVersion: "1.21.4",
      variables: { memory: 4096, motd: "hi", onlineMode: false },
      runtimeKind: "docker",
      createdBy: "alice",
    });
  });

  test("optional fields left out come back empty", () => {
    const created = servers.create(serverInput("Bare"));
    expect(created).toEqual({
      id: created.id,
      name: "Bare",
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: false, attempts: 3 },
      folderId: null,
      blueprintId: "paper",
      blueprintVersion: undefined,
      variables: {},
      runtimeKind: undefined,
      createdBy: null,
    });
  });

  test("the creator gets access to the new server", () => {
    users.create(user("alice"));
    const created = servers.create(
      serverInput("Lobby", { createdBy: "alice" }),
    );
    expect(users.findById("alice")?.serversRestrict.allowed).toEqual([
      created.id,
    ]);
  });

  test("an unknown creator is stored as null instead of failing", () => {
    const created = servers.create(
      serverInput("Lobby", { createdBy: "ghost" }),
    );
    expect(created.createdBy).toBeNull();
  });

  test("server names are unique", () => {
    servers.create(serverInput("Lobby"));
    expect(() => servers.create(serverInput("Lobby"))).toThrow(
      "UNIQUE constraint failed: servers.name",
    );
    expect(servers.findAll()).toHaveLength(1);
  });

  test("finds a server by name", () => {
    const lobby = servers.create(serverInput("Lobby"));
    servers.create(serverInput("Survival"));
    expect(servers.findByName("Lobby")?.id).toBe(lobby.id);
    expect(servers.findByName("lobby")).toBeNull();
  });

  test("update merges the given fields and keeps the rest", () => {
    users.create(user("alice"));
    const created = servers.create(
      serverInput("Lobby", {
        variables: { memory: 2048 },
        createdBy: "alice",
        runtimeKind: "native",
      }),
    );

    const updated = servers.update(created.id, {
      status: ServerStatus.CRASHED,
      variables: { memory: 8192, eula: true },
    });

    expect(updated).toEqual({
      ...created,
      status: ServerStatus.CRASHED,
      variables: { memory: 8192, eula: true },
    });
    expect(servers.findById(created.id)).toEqual(updated);
  });

  test("update can clear the folder", () => {
    const folder = folders.create({ name: "F" });
    const created = servers.create(
      serverInput("Lobby", { folderId: folder.id }),
    );
    expect(servers.update(created.id, { folderId: null })?.folderId).toBeNull();
  });

  test("update and delete of a missing server report it", () => {
    expect(servers.update("nope", { name: "x" })).toBeNull();
    expect(servers.delete("nope")).toBe(false);
  });

  test("deleting a server removes its scheduled tasks and user access", () => {
    users.create(user("alice"));
    const created = servers.create(
      serverInput("Lobby", { createdBy: "alice" }),
    );
    tasks.create({
      serverId: created.id,
      name: "restart",
      enabled: true,
      mode: ScheduleMode.CRON,
      cronExpression: null,
      runAt: null,
      timezone: null,
      schedulePayload: { mode: ScheduleMode.CRON, expression: "0 4 * * *" },
      action: SchedulerActionType.SERVER_RESTART,
      actionPayload: { type: SchedulerActionType.SERVER_RESTART },
      ownerId: "alice",
    });

    expect(servers.delete(created.id)).toBe(true);

    expect(servers.findById(created.id)).toBeNull();
    expect(tasks.findAll()).toEqual([]);
    expect(users.findById("alice")?.serversRestrict.allowed).toEqual([]);
  });

  test("deleting the folder or the creator keeps the server", () => {
    users.create(user("alice"));
    const folder = folders.create({ name: "F" });
    const created = servers.create(
      serverInput("Lobby", { folderId: folder.id, createdBy: "alice" }),
    );

    folders.delete(folder.id);
    users.delete("alice");

    const after = servers.findById(created.id);
    expect(after?.folderId).toBeNull();
    expect(after?.createdBy).toBeNull();
  });
});
