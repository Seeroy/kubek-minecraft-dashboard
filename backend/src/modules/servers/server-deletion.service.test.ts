import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AppEventsService } from "@/core/events/app-events.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import type { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import type { ServersFactory } from "@/modules/servers/servers.factory";
import { fake } from "@/testing/fake";
import { testUser } from "@/testing/user";
import { sqliteProvider } from "@/testing/sqlite";
import { NotFoundException } from "@nestjs/common";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import type { IUser } from "@shared/types/user.types";
import { hashSync } from "bcryptjs";
import fs from "fs";
import os from "os";
import path from "path";
import { ServerDeletionService } from "./server-deletion.service";

class FakeInstance {
  running = false;
  killed = 0;
  disposed = false;
  constructor(readonly serverId: string) {}
  kill = (): Promise<boolean> => {
    this.killed++;
    this.running = false;
    return Promise.resolve(true);
  };
  dispose = (): void => {
    this.disposed = true;
  };
  isRunning = () => this.running;
}

const passwordHash = hashSync("secret", 4);

const user = (overrides: Partial<IUser> = {}): IUser =>
  testUser("u1", {
    username: "admin",
    password: passwordHash,
    isAdmin: true,
    ...overrides,
  });

let cwd: string;
let root: string;
let repo: ServersRepository;
let instances: InstancesRegistry;
let broadcasts: number;
let deletedEvents: string[];
let service: ServerDeletionService;

function addServer(name: string, status = ServerStatus.STOPPED): IServer {
  const server = repo.create({
    name,
    status,
    restartOnError: { enabled: true, attempts: 3 },
    folderId: null,
    blueprintId: "test.core",
    variables: {},
    createdBy: null,
  });
  const dir = path.join(root, "servers", server.id);
  fs.mkdirSync(path.join(dir, "world"), { recursive: true });
  fs.writeFileSync(path.join(dir, "world", "level.dat"), "data");
  return server;
}

const serverDir = (id: string) => path.join(root, "servers", id);

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-servers-"));
  process.chdir(root);

  repo = new ServersRepository(sqliteProvider());
  instances = new InstancesRegistry();
  broadcasts = 0;
  deletedEvents = [];
  const events = new AppEventsService();
  events.on("server.deleted", ({ serverId }) => {
    deletedEvents.push(serverId);
  });

  service = new ServerDeletionService(
    repo,
    instances,
    fake<ServersFactory>({
      broadcastServersList: () => {
        broadcasts++;
      },
    }),
    new PasswordRecheckService(
      fake<RateLimitService>({
        check: () => {},
        hit: () => {},
        fail: () => {},
        succeed: () => {},
      }),
    ),
    events,
  );
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

// Event handlers run on a microtask
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("ServerDeletionService delete", () => {
  test("deleting removes the files, the row and tells everyone", async () => {
    const server = addServer("alpha");

    await service.delete(server.id, user(), "secret", "alpha");
    await flush();

    expect(fs.existsSync(serverDir(server.id))).toBe(false);
    expect(repo.findById(server.id)).toBeNull();
    expect(deletedEvents).toEqual([server.id]);
    expect(broadcasts).toBe(1);
  });

  test("a wrong confirmation name keeps the server", async () => {
    const server = addServer("alpha");

    await expect(
      service.delete(server.id, user(), "secret", "Alpha"),
    ).rejects.toThrow("NAME_MISMATCH");
    expect(fs.existsSync(serverDir(server.id))).toBe(true);
    expect(repo.findById(server.id)?.name).toBe("alpha");
  });

  test("a wrong password keeps the server", async () => {
    const server = addServer("alpha");

    await expect(
      service.delete(server.id, user(), "wrong", "alpha"),
    ).rejects.toThrow("Invalid password");
    expect(fs.existsSync(serverDir(server.id))).toBe(true);
    expect(repo.findById(server.id)?.name).toBe("alpha");
  });

  test("a running server is killed and forgotten before its files go", async () => {
    const server = addServer("alpha", ServerStatus.RUNNING);
    const instance = new FakeInstance(server.id);
    instance.running = true;
    instances.add(fake<ServerInstance>(instance));

    await service.delete(server.id, user(), "secret", "alpha");

    expect(instance.killed).toBe(1);
    expect(instance.disposed).toBe(true);
    expect(instances.getByServerId(server.id)).toBeNull();
  });

  test("deleting an unknown server is a not found", async () => {
    await expect(
      service.delete("missing", user(), "secret", "x"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test("other servers' files are left alone", async () => {
    const alpha = addServer("alpha");
    const beta = addServer("beta");

    await service.delete(alpha.id, user(), "secret", "alpha");

    expect(
      fs.readFileSync(
        path.join(serverDir(beta.id), "world", "level.dat"),
        "utf8",
      ),
    ).toBe("data");
  });
});

describe("ServerDeletionService bulk delete", () => {
  test("deletes what it can and reports the rest", async () => {
    const alpha = addServer("alpha");
    const hidden = addServer("hidden");
    const restricted = user({
      isAdmin: false,
      serversRestrict: { enabled: true, allowed: [alpha.id] },
    });

    const result = await service.bulkDelete(
      [alpha.id, hidden.id, "missing"],
      restricted,
      "secret",
    );

    expect(result).toEqual({
      deleted: [alpha.id],
      failed: [
        { id: hidden.id, reason: "FORBIDDEN" },
        { id: "missing", reason: "NOT_FOUND" },
      ],
    });
    expect(fs.existsSync(serverDir(alpha.id))).toBe(false);
    expect(fs.existsSync(serverDir(hidden.id))).toBe(true);
    expect(repo.findById(hidden.id)?.name).toBe("hidden");
    expect(broadcasts).toBe(1);
  });

  test("a wrong password deletes nothing", async () => {
    const alpha = addServer("alpha");

    await expect(
      service.bulkDelete([alpha.id], user(), "wrong"),
    ).rejects.toThrow("Invalid password");
    expect(repo.findById(alpha.id)?.name).toBe("alpha");
  });

  test("nothing deleted means no list broadcast", async () => {
    const result = await service.bulkDelete(["missing"], user(), "secret");
    expect(result.deleted).toEqual([]);
    expect(broadcasts).toBe(0);
  });
});
