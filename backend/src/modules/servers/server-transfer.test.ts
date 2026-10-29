import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AppEventsService } from "@/core/events/app-events.service";
import { unpack } from "@/core/utils/archives";
import { ConfigService } from "@/modules/config/config.service";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { BlueprintResolver } from "@/modules/server-types/blueprint-resolver.service";
import type { InstallPipeline } from "@/modules/server-types/install-pipeline.service";
import type { DockerService } from "@/modules/server-types/runtime/docker.service";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import type { ServerEventsService } from "@/ws/services/server-events.service";
import type { TasksEventsService } from "@/ws/services/task-events.service";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import fs from "fs";
import os from "os";
import path from "path";
import { ServerTransfer } from "./server-transfer";
import { EXPORT_MANIFEST_FILE } from "./servers.constants";
import { ServersFactory } from "./servers.factory";
import type { ExportManifest } from "./servers.types";

const launchManifest: KubekBlueprintManifest = {
  manifestVersion: 1,
  id: "test.core",
  name: "Test core",
  game: "test",
  version: "1.0.0",
  runtime: { kind: "native" },
  variables: [{ key: "JVM_ARGS", type: "string", default: "" }],
  versions: { kind: "none" },
  install: { steps: [] },
  startup: {
    command: "java {{JVM_ARGS}} -jar server.jar",
    stop: { type: "command", value: "stop" },
  },
  query: { protocol: "none", port: { value: 0 } },
  ports: [],
};

class TestRegistry extends ServerTypesRegistry {
  get(id: string): LoadedBlueprint | undefined {
    return id === launchManifest.id
      ? {
          manifest: launchManifest,
          dir: "",
          source: "bundled",
          valid: true,
          errors: [],
        }
      : undefined;
  }
}

// Stored zip writer, lets a test put any entry name in an archive
function buildZip(entries: { name: string; data: string }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = Buffer.from(entry.data);
    const crc = Bun.hash.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

let cwd: string;
let tmpEnv: string | undefined;
let root: string;
let tmp: string;
let repo: ServersRepository;
let tasks: TasksService;
let transfer: ServerTransfer;
let source: IServer;

const serverDir = (id: string, ...p: string[]) =>
  path.join(root, "servers", id, ...p);
const upload = (buffer: Buffer) =>
  fake<Express.Multer.File>({ originalname: "server.zip", buffer });

const exportManifest = (
  server: Partial<ExportManifest["server"]> = {},
): string =>
  JSON.stringify({
    kubekExport: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    server: {
      name: "imported",
      restartOnError: { enabled: false, attempts: 5 },
      blueprintId: "test.core",
      blueprintVersion: "1.0.0",
      runtimeKind: "native",
      variables: { JVM_ARGS: "-Xmx2G" },
      ...server,
    },
  });

beforeEach(() => {
  cwd = process.cwd();
  tmpEnv = process.env.TMPDIR;
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-transfer-"));
  process.chdir(root);
  // export and import stage in os.tmpdir(), keep it visible for leftover checks
  tmp = path.join(root, "tmp");
  fs.mkdirSync(tmp);
  process.env.TMPDIR = tmp;

  const db = sqliteProvider();
  repo = new ServersRepository(db);
  tasks = new TasksService(
    fake<TasksEventsService>({
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    }),
    fake<ExtensionEventBus>({ publish: () => {} }),
    new AppEventsService(),
  );
  const registry = new TestRegistry();
  const factory = new ServersFactory(
    tasks,
    repo,
    fake<ServerEventsService>({ emitServerList: () => {} }),
    registry,
    new BlueprintResolver(),
    fake<InstallPipeline>({}),
    new ConfigService(new ConfigRepository(db)),
    fake<DockerService>({ available: () => false }),
  );
  transfer = new ServerTransfer(tasks, repo, registry, factory);

  source = repo.create({
    name: "Alpha server!",
    status: ServerStatus.RUNNING,
    restartOnError: { enabled: false, attempts: 7 },
    blueprintId: "test.core",
    blueprintVersion: "1.0.0",
    runtimeKind: "native",
    variables: { JVM_ARGS: "-Xmx1G" },
  });
  fs.mkdirSync(serverDir(source.id, "world"), { recursive: true });
  fs.writeFileSync(serverDir(source.id, "world", "level.dat"), "level");
  fs.writeFileSync(serverDir(source.id, "server.properties"), "motd=hi");
});

afterEach(() => {
  transfer.onModuleDestroy();
  process.chdir(cwd);
  if (tmpEnv === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = tmpEnv;
  fs.rmSync(root, { recursive: true, force: true });
});

async function exportedZip(): Promise<Buffer> {
  const artifact = await transfer.exportServer(source.id);
  const bytes = fs.readFileSync(artifact.archivePath);
  artifact.cleanup();
  return bytes;
}

describe("ServerTransfer duplicate", () => {
  test("a duplicate is a stopped copy with the same files and settings", async () => {
    const { server, taskId } = transfer.duplicateServer(
      source.id,
      "  Copy  ",
      "u1",
    );

    expect(server).toMatchObject({
      name: "Copy",
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: false, attempts: 7 },
      variables: { JVM_ARGS: "-Xmx1G" },
    });
    expect(tasks.getTask(taskId)).toMatchObject({
      type: TaskType.SERVER_DUPLICATE,
      status: TaskStatus.SUCCESS,
    });
    expect(
      fs.readFileSync(serverDir(server.id, "world", "level.dat"), "utf8"),
    ).toBe("level");
  });

  test("a source without files gives an empty folder", () => {
    fs.rmSync(serverDir(source.id), { recursive: true });
    const { server } = transfer.duplicateServer(source.id, "Copy", "u1");
    expect(fs.readdirSync(serverDir(server.id))).toEqual([]);
  });

  test("names must be free and non empty", () => {
    expect(() =>
      transfer.duplicateServer(source.id, "Alpha server!", "u1"),
    ).toThrow("NAME_TAKEN");
    expect(() => transfer.duplicateServer(source.id, "   ", "u1")).toThrow(
      "Name is required",
    );
    expect(() => transfer.duplicateServer("missing", "Copy", "u1")).toThrow(
      NotFoundException,
    );
    expect(repo.findAll()).toHaveLength(1);
  });

  // Root ignores file modes
  test.skipIf(process.getuid?.() === 0)(
    "a failed copy rolls the duplicate back",
    () => {
      fs.chmodSync(serverDir(source.id, "world"), 0o000);
      try {
        const { server, taskId } = transfer.duplicateServer(
          source.id,
          "Copy",
          "u1",
        );

        expect(tasks.getTask(taskId)?.error?.code).toBe(
          "SERVER_DUPLICATE_ERROR",
        );
        expect(repo.findById(server.id)).toBeNull();
        expect(fs.existsSync(serverDir(server.id))).toBe(false);
      } finally {
        fs.chmodSync(serverDir(source.id, "world"), 0o755);
      }
    },
  );
});

describe("ServerTransfer export", () => {
  test("the archive holds the server files and a manifest, the folder is left as it was", async () => {
    const artifact = await transfer.exportServer(source.id);
    const out = path.join(root, "out");
    await unpack(artifact.archivePath, out);

    expect(fs.readFileSync(path.join(out, "world", "level.dat"), "utf8")).toBe(
      "level",
    );
    const manifest: ExportManifest = JSON.parse(
      fs.readFileSync(path.join(out, EXPORT_MANIFEST_FILE), "utf8"),
    );
    expect(manifest.kubekExport).toBe(1);
    expect(manifest.server).toEqual({
      name: "Alpha server!",
      restartOnError: { enabled: false, attempts: 7 },
      blueprintId: "test.core",
      blueprintVersion: "1.0.0",
      runtimeKind: "native",
      variables: { JVM_ARGS: "-Xmx1G" },
    });
    expect(fs.readdirSync(serverDir(source.id)).sort()).toEqual([
      "server.properties",
      "world",
    ]);
    expect(artifact.suggestedName).toMatch(
      /^kubek-export-Alpha_server_-\d{8}\.zip$/,
    );

    artifact.cleanup();
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  test("links in the server folder are not followed into the archive", async () => {
    const secrets = path.join(root, "data");
    fs.mkdirSync(secrets);
    fs.writeFileSync(path.join(secrets, "db.sql"), "secret");
    fs.symlinkSync(secrets, serverDir(source.id, "linked"));
    fs.symlinkSync(
      path.join(secrets, "db.sql"),
      serverDir(source.id, "server-icon.png"),
    );
    // a planted manifest link must not redirect the staging write
    fs.symlinkSync(
      path.join(secrets, "db.sql"),
      serverDir(source.id, EXPORT_MANIFEST_FILE),
    );

    const artifact = await transfer.exportServer(source.id);
    const out = path.join(root, "out");
    await unpack(artifact.archivePath, out);
    artifact.cleanup();

    expect(fs.readdirSync(out).sort()).toEqual([
      EXPORT_MANIFEST_FILE,
      "server.properties",
      "world",
    ]);
    expect(fs.readFileSync(path.join(secrets, "db.sql"), "utf8")).toBe(
      "secret",
    );
  });

  test("export progress stays below 100 and never repeats", async () => {
    const seen: number[] = [];
    const artifact = await transfer.exportServer(source.id, (p) =>
      seen.push(p),
    );
    artifact.cleanup();

    expect(seen.length).toBeGreaterThan(0);
    expect(Math.max(...seen)).toBeLessThanOrEqual(99);
    expect(new Set(seen).size).toBe(seen.length);
  });

  test("a server without files cannot be exported", async () => {
    fs.rmSync(serverDir(source.id), { recursive: true });
    await expect(transfer.exportServer(source.id)).rejects.toThrow(
      "Server directory not found on disk",
    );
    await expect(transfer.exportServer("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test("a finished export task can be taken once by whoever started it", async () => {
    const { taskId } = transfer.startExport(source.id, "u1");
    const task = await tasks.waitFor(taskId);
    expect(task.status).toBe(TaskStatus.SUCCESS);

    expect(() => transfer.takeExport(taskId, "u2")).toThrow(
      "Export not found or expired",
    );
    const artifact = transfer.takeExport(taskId, "u1");
    expect(fs.existsSync(artifact.archivePath)).toBe(true);
    expect(() => transfer.takeExport(taskId, "u1")).toThrow(NotFoundException);
    artifact.cleanup();
  });

  test("exports nobody took are removed on shutdown", async () => {
    const { taskId } = transfer.startExport(source.id, "u1");
    await tasks.waitFor(taskId);

    transfer.onModuleDestroy();

    expect(fs.readdirSync(tmp)).toEqual([]);
    expect(() => transfer.takeExport(taskId, "u1")).toThrow(NotFoundException);
  });

  test("exporting an unknown server fails before a task starts", () => {
    expect(() => transfer.startExport("missing", "u1")).toThrow(
      NotFoundException,
    );
    expect(tasks.getAll()).toEqual([]);
  });
});

describe("ServerTransfer import", () => {
  test("an export imports back as a new stopped server with its files", async () => {
    const zip = await exportedZip();

    const { server, taskId } = await transfer.importServer(
      upload(zip),
      "Restored",
      "u1",
    );

    expect(server).toMatchObject({
      name: "Restored",
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: false, attempts: 7 },
      blueprintId: "test.core",
      variables: { JVM_ARGS: "-Xmx1G" },
    });
    expect(tasks.getTask(taskId)?.status).toBe(TaskStatus.SUCCESS);
    expect(
      fs.readFileSync(serverDir(server.id, "world", "level.dat"), "utf8"),
    ).toBe("level");
    expect(fs.existsSync(serverDir(server.id, EXPORT_MANIFEST_FILE))).toBe(
      false,
    );
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  test("the name from the manifest is used when none is given and must be free", async () => {
    const zip = await exportedZip();

    await expect(
      transfer.importServer(upload(zip), "  ", "u1"),
    ).rejects.toThrow("NAME_TAKEN");
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  test("JAVA_PATH from an archive is dropped", async () => {
    const zip = buildZip([
      {
        name: EXPORT_MANIFEST_FILE,
        data: exportManifest({
          variables: { JAVA_PATH: "/tmp/evil", JVM_ARGS: "-Xmx1G" },
        }),
      },
    ]);

    const { server } = await transfer.importServer(
      upload(zip),
      undefined,
      "u1",
    );

    expect(server.name).toBe("imported");
    expect(server.variables).toEqual({ JVM_ARGS: "-Xmx1G" });
  });

  test("launch variables that would inject shell commands are refused", async () => {
    const zip = buildZip([
      {
        name: EXPORT_MANIFEST_FILE,
        data: exportManifest({ variables: { JVM_ARGS: "-Xmx1G; rm -rf /" } }),
      },
    ]);

    await expect(
      transfer.importServer(upload(zip), undefined, "u1"),
    ).rejects.toThrow(
      'Variable JVM_ARGS can\'t be used in the launch command: character ";" is not allowed',
    );
    expect(repo.findByName("imported")).toBeNull();
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  test("entries that climb out of the archive stay inside the new server", async () => {
    const zip = buildZip([
      { name: EXPORT_MANIFEST_FILE, data: exportManifest() },
      { name: "../../escaped.txt", data: "x" },
      { name: "plugins/a.jar", data: "a" },
    ]);

    const { server } = await transfer.importServer(
      upload(zip),
      undefined,
      "u1",
    );

    expect(fs.existsSync(path.join(root, "escaped.txt"))).toBe(false);
    expect(fs.existsSync(path.join(root, "servers", "escaped.txt"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(tmp, "escaped.txt"))).toBe(false);
    expect(
      fs.readFileSync(serverDir(server.id, "plugins", "a.jar"), "utf8"),
    ).toBe("a");
  });

  test.each([
    ["no archive", undefined, "No archive provided"],
    [
      "a file that is not a zip",
      upload(Buffer.from("plain text")),
      "Failed to unpack archive",
    ],
    [
      "a zip without a manifest",
      upload(buildZip([{ name: "a.txt", data: "a" }])),
      "Manifest missing - not a kubek export",
    ],
    [
      "a corrupted manifest",
      upload(buildZip([{ name: EXPORT_MANIFEST_FILE, data: "{nope" }])),
      "Manifest is corrupted",
    ],
    [
      "a manifest of another version",
      upload(
        buildZip([
          {
            name: EXPORT_MANIFEST_FILE,
            data: JSON.stringify({ kubekExport: 2, server: {} }),
          },
        ]),
      ),
      "Unsupported manifest version",
    ],
    [
      "a manifest without a blueprint",
      upload(
        buildZip([
          {
            name: EXPORT_MANIFEST_FILE,
            data: exportManifest({ blueprintId: "" }),
          },
        ]),
      ),
      "Archive has no blueprint - not importable",
    ],
    [
      "a manifest without a name",
      upload(
        buildZip([
          { name: EXPORT_MANIFEST_FILE, data: exportManifest({ name: "" }) },
        ]),
      ),
      "Server name is empty",
    ],
  ])(
    "%s is refused and leaves nothing behind",
    async (_label, file, message) => {
      const result = transfer.importServer(file, undefined, "u1");

      await expect(result).rejects.toThrow(message);
      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findAll()).toHaveLength(1);
      expect(fs.readdirSync(tmp)).toEqual([]);
    },
  );

  test("a failed restore rolls the imported server back", async () => {
    const zip = buildZip([
      { name: EXPORT_MANIFEST_FILE, data: exportManifest() },
    ]);
    fs.rmSync(path.join(root, "servers"), { recursive: true });
    fs.writeFileSync(path.join(root, "servers"), "not a folder");

    const { server, taskId } = await transfer.importServer(
      upload(zip),
      undefined,
      "u1",
    );

    expect(tasks.getTask(taskId)?.error?.code).toBe("SERVER_IMPORT_ERROR");
    expect(repo.findById(server.id)).toBeNull();
  });
});
