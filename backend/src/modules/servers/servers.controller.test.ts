import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AppEventsService } from "@/core/events/app-events.service";
import { readAuditNote } from "@/modules/audit-log/audit.decorator";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import type { ServerInstance } from "@/modules/instances/instance";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import type { ServerInstanceFactory } from "@/modules/instances/server-instance.factory";
import type { JavaService } from "@/modules/java/java.service";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import type { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { testUser } from "@/testing/user";
import { sqliteProvider } from "@/testing/sqlite";
import type { TasksEventsService } from "@/ws/services/task-events.service";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  type IServer,
  type NewServerProps,
  ServerStatus,
} from "@shared/types/server/server.types";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import { hashSync } from "bcryptjs";
import type { Request } from "express";
import fs from "fs";
import os from "os";
import path from "path";
import type { ServerBootService } from "./server-boot.service";
import type { ServerCoreChanger } from "./server-core-changer";
import { ServerDeletionService } from "./server-deletion.service";
import { ServerIconController } from "./server-icon.controller";
import { ServerIconService } from "./server-icon.service";
import { ServerSettingsController } from "./server-settings.controller";
import type { ServerTransfer } from "./server-transfer";
import { ServerTransferController } from "./server-transfer.controller";
import { ServersController } from "./servers.controller";
import type { ServersFactory } from "./servers.factory";
import { ServersService } from "./servers.service";
import type { ExportArtifact } from "./servers.types";

const manifest: KubekBlueprintManifest = {
  manifestVersion: 1,
  id: "test.core",
  name: "Test core",
  game: "test",
  version: "1.0.0",
  runtime: { kind: "native" },
  variables: [
    { key: "MEMORY", label: "Memory", type: "number", default: 1024 },
  ],
  versions: { kind: "none" },
  install: { steps: [] },
  startup: { command: "run", stop: { type: "command", value: "stop" } },
  query: { protocol: "none", port: { value: 0 } },
  ports: [],
};

class TestRegistry extends ServerTypesRegistry {
  get(id: string): LoadedBlueprint | undefined {
    return id === manifest.id
      ? { manifest, dir: "", source: "bundled", valid: true, errors: [] }
      : undefined;
  }
}

const passwordHash = hashSync("secret", 4);
const user = (overrides: Partial<IUser> = {}): IUser =>
  testUser("u1", {
    username: "admin",
    password: passwordHash,
    isAdmin: true,
    ...overrides,
  });

class FakeResponse {
  headers: Record<string, string> = {};
  sent?: string;
  statusCode?: number;
  ended = false;
  headersSent = false;
  sendError: Error | null = null;
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  sendFile(file: string, done?: (err: Error | null) => void) {
    this.sent = file;
    done?.(this.sendError);
  }
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  end() {
    this.ended = true;
  }
}

let cwd: string;
let root: string;
let repo: ServersRepository;
let created: {
  props: NewServerProps;
  ownerId?: string;
  file?: Express.Multer.File;
}[];
let properties: Map<string, Record<string, string>>;
let artifact: ExportArtifact;
let cleanedUp: number;
let controller: ServersController;
let settings: ServerSettingsController;
let transfer: ServerTransferController;
let icons: ServerIconController;

const request = () => fake<Request>({});
const jar = fake<Express.Multer.File>({
  originalname: "core.jar",
  buffer: Buffer.from("jar"),
});

function addServer(name: string): IServer {
  const server = repo.create({
    name,
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: true, attempts: 3 },
    blueprintId: manifest.id,
    variables: { MEMORY: 1024 },
  });
  fs.mkdirSync(path.join(root, "servers", server.id), { recursive: true });
  return server;
}

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-controller-"));
  process.chdir(root);

  repo = new ServersRepository(sqliteProvider());
  created = [];
  properties = new Map();
  cleanedUp = 0;
  const archivePath = path.join(root, "export.zip");
  fs.writeFileSync(archivePath, "zip");
  artifact = {
    archivePath,
    suggestedName: "kubek-export-alpha.zip",
    cleanup: () => {
      cleanedUp++;
    },
  };

  const instances = new InstancesRegistry();
  const serversFactory = fake<ServersFactory>({
    prepareServerDataAndCreateServer: (props, ownerId, file) => {
      created.push({ props, ownerId, file });
      return { server: addServer(props.name), taskId: "create-task" };
    },
    broadcastServersList: () => {},
  });
  const tasks = new TasksService(
    fake<TasksEventsService>({
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    }),
    fake<ExtensionEventBus>({ publish: () => {} }),
    new AppEventsService(),
  );
  const service = new ServersService(
    repo,
    instances,
    fake<ServerInstanceFactory>({
      create: (server) =>
        fake<ServerInstance>({
          serverId: server.id,
          readServerProperties: () =>
            Promise.resolve(properties.get(server.id) ?? null),
          writeServerProperties: (data) => {
            properties.set(
              server.id,
              Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)]),
              ),
            );
            return Promise.resolve(true);
          },
        }),
    }),
    serversFactory,
    fake<ServerCoreChanger>({
      changeCore: (server) => ({ server, taskId: "core-task" }),
    }),
    tasks,
    new TestRegistry(),
    new BlueprintResolver(),
    fake<ServerBootService>({ containersReady: Promise.resolve() }),
  );
  const deletion = new ServerDeletionService(
    repo,
    instances,
    serversFactory,
    new PasswordRecheckService(
      fake<RateLimitService>({
        check: () => {},
        hit: () => {},
        fail: () => {},
        succeed: () => {},
      }),
    ),
    new AppEventsService(),
  );
  const java = fake<JavaService>({
    assertJavaPathAllowed: (javaPath) =>
      javaPath
        ? Promise.reject(
            new ForbiddenException(
              "Custom Java paths require java manage access",
            ),
          )
        : Promise.resolve(),
  });

  controller = new ServersController(service, deletion, java);
  settings = new ServerSettingsController(service, java);
  transfer = new ServerTransferController(
    fake<ServerTransfer>({
      exportServer: () => Promise.resolve(artifact),
      takeExport: (_taskId, userId) => {
        if (userId !== "u1")
          throw new NotFoundException("Export not found or expired");
        return artifact;
      },
    }),
  );
  icons = new ServerIconController(new ServerIconService(repo));
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("ServersController reading", () => {
  test("a restricted user only sees the servers on their list", () => {
    const alpha = addServer("alpha");
    addServer("beta");

    const restricted = user({
      isAdmin: false,
      access: { levels: { [AccessArea.POWER]: "read" }, ext: [] },
      serversRestrict: { enabled: true, allowed: [alpha.id] },
    });

    expect(controller.getAll(restricted).map((s) => s.name)).toEqual(["alpha"]);
    expect(
      controller
        .getAll(user())
        .map((s) => s.name)
        .sort(),
    ).toEqual(["alpha", "beta"]);
  });

  test("an account without any server area sees no servers", () => {
    addServer("alpha");
    const panelOnly = user({
      isAdmin: false,
      access: { levels: { [AccessArea.JAVA]: "manage" }, ext: [] },
    });
    expect(controller.getAll(panelOnly)).toEqual([]);
  });

  test("an unknown server is a not found", () => {
    expect(() => controller.getById("missing")).toThrow(NotFoundException);
  });
});

describe("ServersController create", () => {
  const dto = { name: "alpha", blueprintId: manifest.id, variables: {} };

  test("a server is created for the calling user", async () => {
    const result = await controller.create(dto, jar, user());

    expect(result.taskId).toBe("create-task");
    expect(result.server.name).toBe("alpha");
    expect(created[0].ownerId).toBe("u1");
  });

  test("a custom core without a jar is refused before anything is created", async () => {
    // multer passes undefined when nothing was sent
    await expect(
      Reflect.apply(controller.create, controller, [
        { ...dto, blueprintId: "com.kubek.custom" },
        undefined,
        user(),
      ]),
    ).rejects.toThrow("coreFile is required for custom servers");
    expect(created).toEqual([]);
  });

  test("a java path the user may not use stops creation", async () => {
    await expect(
      controller.create(
        { ...dto, variables: { JAVA_PATH: "/opt/java" } },
        jar,
        user(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(created).toEqual([]);
  });
});

describe("ServerSettingsController settings and core", () => {
  test("settings changes are noted for the audit log with variable labels", async () => {
    const server = addServer("alpha");
    const req = request();

    const updated = await settings.updateSettings(
      server.id,
      { name: "beta", variables: { MEMORY: 2048 } },
      user(),
      req,
    );

    expect(updated.name).toBe("beta");
    expect(readAuditNote(req)?.changes).toEqual([
      { field: "name", from: "alpha", to: "beta" },
      { field: "variables.MEMORY", from: 1024, to: 2048, label: "Memory" },
    ]);
  });

  test("a changed java path is checked before saving", async () => {
    const server = addServer("alpha");

    await expect(
      settings.updateSettings(
        server.id,
        { variables: { JAVA_PATH: "/opt/java" } },
        user(),
        request(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.findById(server.id)?.variables).toEqual({ MEMORY: 1024 });
  });

  test("a custom core change needs a jar", () => {
    const server = addServer("alpha");
    expect(() =>
      Reflect.apply(settings.changeCore, settings, [
        server.id,
        { blueprintId: "com.kubek.custom" },
        undefined,
        user(),
        request(),
      ]),
    ).toThrow("coreFile is required for custom cores");
  });

  test("a core change notes the old and new core", () => {
    const server = addServer("alpha");
    const req = request();

    settings.changeCore(
      server.id,
      { blueprintId: "other.core", version: "1.21" },
      jar,
      user(),
      req,
    );

    expect(readAuditNote(req)?.changes).toEqual([
      { field: "blueprintId", from: manifest.id, to: "other.core" },
      { field: "version", from: null, to: "1.21" },
    ]);
  });
});

describe("ServerSettingsController properties", () => {
  test("properties saved for the first time are all new in the audit note", async () => {
    const server = addServer("alpha");
    const req = request();

    await settings.saveProperties(
      server.id,
      { properties: { motd: "hi", "max-players": 5 } },
      req,
    );

    expect(await settings.getProperties(server.id)).toEqual({
      motd: "hi",
      "max-players": "5",
    });
    expect(readAuditNote(req)?.changes).toEqual([
      { field: "motd", from: null, to: "hi" },
      { field: "max-players", from: null, to: "5" },
    ]);
  });
});

describe("ServersController bulk delete", () => {
  test("the audit note names deleted and failed servers", async () => {
    const alpha = addServer("alpha");
    const req = request();

    const result = await controller.bulkDelete(
      { ids: [alpha.id, "missing"], password: "secret" },
      user(),
      req,
    );

    expect(result.deleted).toEqual([alpha.id]);
    expect(readAuditNote(req)?.details).toEqual({
      servers: undefined,
      deleted: ["alpha"],
      failed: ["missing: NOT_FOUND"],
    });
  });
});

describe("ServerTransferController export download", () => {
  test("the archive is sent as an attachment and cleaned up after", () => {
    const res = new FakeResponse();

    transfer.downloadExport("task", user(), res);

    expect(res.headers).toEqual({
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="kubek-export-alpha.zip"',
    });
    expect(res.sent).toBe(artifact.archivePath);
    expect(cleanedUp).toBe(1);
  });

  test("a failed send still cleans up and answers 500", async () => {
    const res = new FakeResponse();
    res.sendError = new Error("socket closed");

    await transfer.exportServer("srv", res);

    expect(cleanedUp).toBe(1);
    expect(res.statusCode).toBe(500);
    expect(res.ended).toBe(true);
  });

  test("someone else's export is a not found", () => {
    expect(() =>
      transfer.downloadExport("task", user({ id: "u2" }), new FakeResponse()),
    ).toThrow(NotFoundException);
    expect(cleanedUp).toBe(0);
  });
});

describe("ServerIconController", () => {
  test("a server without an icon is a not found", async () => {
    const server = addServer("alpha");
    await expect(
      icons.getIcon(server.id, new FakeResponse()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test("an existing icon is sent from the server folder", async () => {
    const server = addServer("alpha");
    fs.writeFileSync(
      path.join(root, "servers", server.id, "server-icon.png"),
      "png",
    );
    const res = new FakeResponse();

    await icons.getIcon(server.id, res);

    expect(res.sent).toBe(
      path.resolve("servers", server.id, "server-icon.png"),
    );
  });
});
