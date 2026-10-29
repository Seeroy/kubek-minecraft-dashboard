import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import type { DatabaseSeeder } from "@/modules/database/database.seeder";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { LegacyMigrationService } from "./legacy-migration.service";

function write(root: string, file: string, content: string | object) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    typeof content === "string" ? content : JSON.stringify(content),
  );
}

describe("LegacyMigrationService", () => {
  let root: string;
  let cwd: string;
  const logs: string[] = [];

  beforeEach(() => {
    cwd = process.cwd();
    root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-legacy-"));
    logs.length = 0;
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });
    spyOn(console, "error").mockImplementation(() => {});

    write(root, "config.json", { webserverPort: 3000, eulaAccepted: true });
    write(root, "users.json", {
      kubek: { permissions: ["accounts", "kubek_settings"] },
    });
    write(root, "servers/servers.json", {
      Survival: { restartOnError: true, minecraftType: "java" },
      Broken: { minecraftType: "java" },
    });
    write(root, "servers/Survival/paper-1.16.5.jar", "jar");
    write(
      root,
      "servers/Survival/start.sh",
      'cd servers\ncd Survival\n"/opt/kubek/binaries/java/16/bin/java" -Dfile.encoding=UTF-8 -Xmx3G -jar paper-1.16.5.jar nogui',
    );
    write(root, "servers/Survival/world/level.dat", "level");
  });

  afterEach(() => {
    mock.restore();
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  function makeService() {
    const sqlite = sqliteProvider();
    const servers = new ServersRepository(sqlite);
    const users = new UsersRepository(sqlite);
    // root comes from cwd at construction
    process.chdir(root);
    const service = new LegacyMigrationService(
      sqlite,
      new ConfigRepository(sqlite),
      servers,
      users,
      fake<DatabaseSeeder>({ seed: async () => {} }),
    );
    process.chdir(cwd);
    return { service, servers, users };
  }

  it("imports a 3.x server that starts from server.jar", async () => {
    const { service, servers } = makeService();
    const create = servers.create.bind(servers);
    spyOn(servers, "create").mockImplementation((server) => {
      if (server.name === "Broken") throw new Error("disk full");
      return create(server);
    });

    await service.onModuleInit();

    const all = servers.findAll();
    expect(all.map((s) => s.name)).toEqual(["Survival"]);
    const [server] = all;
    expect(server.blueprintId).toBe("com.kubek.paper");
    expect(server.variables).toEqual({
      XMX: 3072,
      GAME_VERSION: "1.16.5",
      JAVA_VERSION: 16,
    });

    const dir = path.join(root, "servers", server.id);
    expect(fs.existsSync(path.join(dir, "server.jar"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "paper-1.16.5.jar"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "world", "level.dat"))).toBe(true);
    expect(fs.existsSync(path.join(root, "servers", "Survival"))).toBe(false);
    expect(
      fs.existsSync(path.join(root, "servers", "servers.json.migrated-backup")),
    ).toBe(true);

    const report = logs.join("\n");
    expect(report).toContain("not imported");
    expect(report).toContain("Broken");
    expect(report).toContain("disk full");
  });

  it("picks Java from the game version when the script has none", async () => {
    write(
      root,
      "servers/Survival/start.sh",
      "java -Xmx2G -jar paper-1.16.5.jar",
    );
    const { service, servers } = makeService();

    await service.onModuleInit();

    const survival = servers.findByName("Survival");
    expect(survival?.variables.JAVA_VERSION).toBe(8);
  });

  it("finishes the jar rename on the next start", async () => {
    const { service, servers } = makeService();
    const rename = fs.renameSync;
    const spy = spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(to).endsWith("server.jar")) throw new Error("busy");
      return rename(from, to);
    });

    await service.onModuleInit();
    const id = servers.findByName("Survival")!.id;
    expect(fs.existsSync(path.join(root, "servers", id, "server.jar"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(root, "servers", "servers.json"))).toBe(
      true,
    );

    spy.mockRestore();
    await service.onModuleInit();
    expect(fs.existsSync(path.join(root, "servers", id, "server.jar"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(root, "servers", "servers.json"))).toBe(
      false,
    );
  });

  it("imports the account and config", async () => {
    const { service, users } = makeService();
    await service.onModuleInit();
    expect(users.findByUsername("kubek")?.isAdmin).toBe(true);
    expect(fs.existsSync(path.join(root, "migrated-credentials.txt"))).toBe(
      true,
    );
  });
});
