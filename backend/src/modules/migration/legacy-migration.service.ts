import { generateRandomString } from "@/core/utils/randomString";
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

// One-time import of legacy Kubek data
@Injectable()
export class LegacyMigrationService implements OnModuleInit {
  private readonly root = process.cwd();

  constructor(
    private readonly sqlite: SqliteProvider,
    private readonly config: ConfigRepository,
    private readonly servers: ServersRepository,
    private readonly users: UsersRepository,
  ) {}

  onModuleInit(): void {
    try {
      this.run();
    } catch (error) {
      console.error(chalk.red("[Migration] Legacy migration failed:"), error);
    }
  }

  private run(): void {
    if (this.alreadyMigrated()) return;

    const configPath = path.join(this.root, "config.json");
    const usersPath = path.join(this.root, "users.json");
    const serversJsonPath = path.join(this.root, "servers", "servers.json");

    const hasLegacyData =
      fs.existsSync(configPath) ||
      fs.existsSync(usersPath) ||
      fs.existsSync(serversJsonPath);
    if (!hasLegacyData) return;

    console.log(
      chalk.cyan("[Migration] Legacy Kubek data detected, importing…"),
    );

    let importedConfig = false;
    if (fs.existsSync(configPath)) {
      importedConfig = this.migrateConfig(configPath);
    }

    // Servers before users: access restrictions reference server names that
    // must be remapped to the new server UUIDs
    const serverNameToId = new Map<string, string>();
    if (fs.existsSync(serversJsonPath)) {
      this.migrateServers(serversJsonPath, serverNameToId);
    }

    const credentials: { username: string; password: string }[] = [];
    if (fs.existsSync(usersPath)) {
      this.migrateUsers(usersPath, serverNameToId, credentials);
    }

    this.backup(configPath, usersPath, serversJsonPath);
    this.setMarker();
    this.printSummary(importedConfig, serverNameToId.size, credentials);
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
  ): void {
    const legacyServers = readJson<LegacyServersFile>(serversJsonPath);
    if (!legacyServers) return;

    for (const [name, legacy] of Object.entries(legacyServers)) {
      try {
        const dir = path.join(this.root, "servers", name);
        const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
        const binaryName = exists ? this.detectJar(dir) : "";
        const startupArguments = exists ? this.parseStartupArguments(dir) : [];

        const created = this.servers.create(
          mapServer(legacy, name, binaryName, startupArguments),
        );
        nameToId.set(name, created.id);

        // ./servers/<name> -> ./servers/<uuid>; start scripts get regenerated on launch
        if (exists) {
          const target = path.join(this.root, "servers", created.id);
          if (!fs.existsSync(target)) fs.renameSync(dir, target);
        }
      } catch (error) {
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
  ): void {
    console.log(chalk.green("[Migration] Legacy import complete:"));
    console.log(`   • settings:  ${importedConfig ? "imported" : "skipped"}`);
    console.log(`   • servers:   ${serverCount} migrated`);
    console.log(`   • accounts:  ${credentials.length} migrated`);

    if (credentials.length > 0) {
      console.log(
        chalk.black.bgYellowBright(
          " New passwords were generated (old ones can't be carried over). Save them now: ",
        ),
      );
      for (const { username, password } of credentials) {
        console.log(`   ${chalk.bold(username)}  →  ${chalk.cyan(password)}`);
      }
    }

    if (importedConfig) {
      console.log(
        chalk.gray(
          "   Note: a migrated web-server port takes effect after the next restart.",
        ),
      );
    }
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}
