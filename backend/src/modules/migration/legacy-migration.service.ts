import { getErrorMessage } from "@/core/utils/error";
import { generateRandomString } from "@/core/utils/randomString";
import { DatabaseSeeder } from "@/modules/database/database.seeder";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { SqliteProvider } from "@/modules/database/sqlite.provider";
import { Injectable, OnModuleInit } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import chalk from "chalk";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CORE_TYPES } from "./legacy-core-types";
import { mapConfig, mapServer, mapUser } from "./legacy-mappers";
import type {
  LegacyConfig,
  LegacyServersFile,
  LegacyUsersFile,
} from "./legacy.types";

const MARKER_KEY = "legacyMigratedAt";
const BACKUP_SUFFIX = ".migrated-backup";
const CREDENTIALS_FILE = "migrated-credentials.txt";
// What the bundled blueprints launch
const SERVER_JAR = "server.jar";

interface SkippedServer {
  name: string;
  reason: string;
}

// One-time import from Kubek 3.x. All database writes go in one transaction,
// folders are moved after it and the move is retried on the next start
@Injectable()
export class LegacyMigrationService implements OnModuleInit {
  private readonly root = process.cwd();

  constructor(
    private readonly sqlite: SqliteProvider,
    private readonly config: ConfigRepository,
    private readonly servers: ServersRepository,
    private readonly users: UsersRepository,
    private readonly seeder: DatabaseSeeder,
  ) {}

  // Seed after the import, otherwise a new kubek admin takes the name
  // of the imported one
  async onModuleInit(): Promise<void> {
    try {
      this.run();
    } catch (error) {
      console.error(
        chalk.red("[Migration] Legacy migration failed, nothing was imported:"),
        error,
      );
    }
    await this.seeder.seed();
  }

  private run(): void {
    const configPath = path.join(this.root, "config.json");
    const usersPath = path.join(this.root, "users.json");
    const serversJsonPath = path.join(this.root, "servers", "servers.json");

    if (this.alreadyMigrated()) {
      this.finishFileMoves(configPath, usersPath, serversJsonPath);
      return;
    }

    const hasLegacyData =
      fs.existsSync(configPath) ||
      fs.existsSync(usersPath) ||
      fs.existsSync(serversJsonPath);
    if (!hasLegacyData) return;

    let importedConfig = false;
    const serverNameToId = new Map<string, string>();
    const credentials: { username: string; password: string }[] = [];
    const skipped: SkippedServer[] = [];
    const notes: string[] = [];

    this.sqlite.connection.transaction(() => {
      if (fs.existsSync(configPath)) {
        importedConfig = this.migrateConfig(configPath);
      }

      // Servers before users: access restrictions reference server names that
      // must be remapped to the new server UUIDs
      if (fs.existsSync(serversJsonPath)) {
        this.migrateServers(serversJsonPath, serverNameToId, skipped, notes);
      }

      if (fs.existsSync(usersPath)) {
        this.migrateUsers(usersPath, serverNameToId, credentials);
      }

      this.setMarker();
      // Before commit, so new passwords are never lost
      this.saveCredentials(credentials);
    })();

    this.finishFileMoves(configPath, usersPath, serversJsonPath);
    this.printSummary(
      importedConfig,
      serverNameToId.size,
      credentials,
      skipped,
      notes,
    );
  }

  private migrateConfig(configPath: string): boolean {
    const legacy = readJson<LegacyConfig>(configPath);
    if (!legacy) return false;
    this.config.updateAll(mapConfig(legacy));
    return true;
  }

  private migrateServers(
    serversJsonPath: string,
    nameToId: Map<string, string>,
    skipped: SkippedServer[],
    notes: string[],
  ): void {
    const legacyServers = readJson<LegacyServersFile>(serversJsonPath);
    if (!legacyServers) {
      skipped.push({ name: "servers.json", reason: "unreadable JSON" });
      return;
    }

    for (const [name, legacy] of Object.entries(legacyServers)) {
      try {
        const dir = path.join(this.root, "servers", name);
        const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
        const binaryName = exists ? this.detectJar(dir) : "";
        const startupArguments = exists ? this.parseStartupArguments(dir) : [];
        const scriptJava = exists ? this.parseScriptJava(dir) : undefined;

        const mapped = mapServer(
          legacy,
          name,
          binaryName,
          startupArguments,
          scriptJava,
        );
        const created = this.servers.create(mapped);
        nameToId.set(name, created.id);

        if (!exists) notes.push(`"${name}": no servers/${name} folder found`);
        if (binaryName.toLowerCase().includes(CORE_TYPES.BEAMMP)) {
          notes.push(
            `"${name}": BeamMP has no blueprint, imported as Custom JAR, check how it starts`,
          );
        }
      } catch (error) {
        skipped.push({ name, reason: getErrorMessage(error) });
        console.error(
          chalk.yellow(`[Migration] Failed to migrate server "${name}":`),
          error,
        );
      }
    }
  }

  // Prefer a jar whose name matches a known core, else the largest one :)
  private detectJar(dir: string): string {
    const jars = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".jar"))
      .map((e) => e.name);
    if (jars.length === 0) return "";

    const cores = Object.values(CORE_TYPES) as string[];
    const known = jars.find((j) =>
      cores.some((c) => j.toLowerCase().includes(c)),
    );
    if (known) return known;

    return jars.reduce((largest, current) => {
      const sizeOf = (f: string) => fs.statSync(path.join(dir, f)).size;
      return sizeOf(current) > sizeOf(largest) ? current : largest;
    });
  }

  // Pull JVM flags (-Xmx/-Xms/-XX) from the old start script so Xmx value survives
  private parseStartupArguments(dir: string): string[] {
    for (const script of ["start.sh", "start.bat"]) {
      const scriptPath = path.join(dir, script);
      if (!fs.existsSync(scriptPath)) continue;
      const content = fs.readFileSync(scriptPath, "utf8");
      const args = content.split(/\s+/).filter((token) => /^-X/.test(token));
      if (args.length > 0) return [...new Set(args)];
    }
    return [];
  }

  // 3.x start scripts point at ./binaries/java/<major>/..., same folder 4.x uses
  private parseScriptJava(dir: string): number | undefined {
    for (const script of ["start.sh", "start.bat"]) {
      const scriptPath = path.join(dir, script);
      if (!fs.existsSync(scriptPath)) continue;
      const content = fs.readFileSync(scriptPath, "utf8");
      const match = /binaries[\\/]java[\\/](\d+)[\\/]/.exec(content);
      if (match) return Number(match[1]);
    }
    return undefined;
  }

  private migrateUsers(
    usersPath: string,
    nameToId: Map<string, string>,
    credentials: { username: string; password: string }[],
  ): void {
    const legacyUsers = readJson<LegacyUsersFile>(usersPath);
    if (!legacyUsers) return;

    for (const [username, legacy] of Object.entries(legacyUsers)) {
      try {
        if (this.users.findByUsername(username)) continue;

        const password = generateRandomString(14);
        const hashed = bcrypt.hashSync(password, 10);
        const user = mapUser(legacy, username, randomUUID(), hashed, nameToId);
        this.users.create(user);
        credentials.push({ username, password });
      } catch (error) {
        console.error(
          chalk.yellow(`[Migration] Failed to migrate user "${username}":`),
          error,
        );
      }
    }
  }

  // Renames ./servers/<name> to ./servers/<uuid>, start scripts are rebuilt on launch.
  // servers.json is moved away only when every folder is renamed
  private finishFileMoves(
    configPath: string,
    usersPath: string,
    serversJsonPath: string,
  ): void {
    let serversDone = true;
    const legacyServers = fs.existsSync(serversJsonPath)
      ? readJson<LegacyServersFile>(serversJsonPath)
      : null;

    for (const name of Object.keys(legacyServers ?? {})) {
      const server = this.servers.findByName(name);
      if (!server) continue;
      const from = path.join(this.root, "servers", name);
      const to = path.join(this.root, "servers", server.id);
      try {
        if (fs.existsSync(from) && !fs.existsSync(to)) fs.renameSync(from, to);
        const isJava = server.blueprintId !== "com.kubek.bedrock";
        if (isJava && fs.existsSync(to)) this.ensureServerJar(to);
      } catch (error) {
        serversDone = false;
        console.error(
          chalk.yellow(
            `[Migration] Failed to move files of "${name}", will retry on next start:`,
          ),
          error,
        );
      }
    }

    this.backup(configPath, usersPath);
    if (serversDone) this.backup(serversJsonPath);
  }

  // 3.x named the jar after the core, panel runs server.jar
  private ensureServerJar(dir: string): void {
    if (fs.existsSync(path.join(dir, SERVER_JAR))) return;
    const jar = this.detectJar(dir);
    if (jar) fs.renameSync(path.join(dir, jar), path.join(dir, SERVER_JAR));
  }

  private saveCredentials(
    credentials: { username: string; password: string }[],
  ): void {
    if (credentials.length === 0) return;
    const lines = credentials.map((c) => `${c.username}  ${c.password}`);
    fs.writeFileSync(
      path.join(this.root, CREDENTIALS_FILE),
      `Kubek accounts imported on ${new Date().toISOString()}\n${lines.join("\n")}\n`,
      { mode: 0o600 },
    );
  }

  private alreadyMigrated(): boolean {
    const row = this.sqlite.connection
      .query("SELECT value FROM config_kv WHERE key = ?")
      .get(MARKER_KEY) as { value: string } | undefined;
    return !!row;
  }

  private setMarker(): void {
    this.sqlite.connection
      .prepare(
        "INSERT INTO config_kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(MARKER_KEY, new Date().toISOString());
  }

  // Rename legacy files aside so they aren't re-imported
  private backup(...paths: string[]): void {
    for (const filePath of paths) {
      if (!fs.existsSync(filePath)) continue;
      const dest = filePath + BACKUP_SUFFIX;
      try {
        if (!fs.existsSync(dest)) fs.renameSync(filePath, dest);
      } catch {
        // non-fatal, the marker still prevents re-running
      }
    }
  }

  private printSummary(
    importedConfig: boolean,
    serverCount: number,
    credentials: { username: string; password: string }[],
    skipped: SkippedServer[],
    notes: string[],
  ): void {
    const indent = "       ";
    const done = (text: string) =>
      console.log(`${indent}${chalk.green("✔")} ${text}`);

    console.log(" ");
    console.log(
      `    📦 ${chalk.bold("Imported data from the previous Kubek")}`,
    );
    done(
      importedConfig ? "panel settings" : chalk.gray("panel settings skipped"),
    );
    done(`${serverCount} ${serverCount === 1 ? "server" : "servers"}`);
    done(
      `${credentials.length} ${credentials.length === 1 ? "account" : "accounts"}`,
    );

    if (credentials.length > 0) {
      console.log(" ");
      console.log(
        `${indent}${chalk.black.bgYellowBright(" Old passwords can't be carried over, new ones were generated: ")}`,
      );
      for (const { username, password } of credentials) {
        console.log(
          `${indent}  ${chalk.bold(username)}  →  ${chalk.cyan(password)}`,
        );
      }
      console.log(
        `${indent}${chalk.gray(`Also saved to ${CREDENTIALS_FILE}, delete it once passwords are changed`)}`,
      );
    }

    if (skipped.length > 0) {
      console.log(" ");
      console.log(
        `${indent}${chalk.black.bgYellowBright(` ${skipped.length} ${skipped.length === 1 ? "server was" : "servers were"} not imported: `)}`,
      );
      for (const { name, reason } of skipped) {
        console.log(
          `${indent}  ${chalk.yellow("✘")} ${chalk.bold(name)}  ${reason}`,
        );
      }
      console.log(
        `${indent}${chalk.gray(`Their folders stay in servers/, old entries are in servers/servers.json${BACKUP_SUFFIX}`)}`,
      );
    }

    for (const note of notes) {
      console.log(`${indent}${chalk.yellow("!")} ${note}`);
    }

    if (importedConfig) {
      console.log(
        `${indent}${chalk.gray("The imported web-server port takes effect after the next restart")}`,
      );
    }
    console.log(" ");
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}
