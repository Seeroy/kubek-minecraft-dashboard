import { Injectable, OnModuleInit } from "@nestjs/common";
import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";
import { runMigrations } from "./migrations/migration-runner";

@Injectable()
export class SqliteProvider implements OnModuleInit {
  private db!: Database;
  private readonly dbFilePath: string;

  constructor() {
    this.dbFilePath = path.join(process.cwd(), "db.sql");
  }

  onModuleInit(): void {
    this.ensureDatabaseFile();
    this.openDatabase();
    runMigrations(this.db, this.dbFilePath);
  }

  get connection() {
    if (!this.db) throw new Error("SQLite not initialized");
    return this.db;
  }

  private ensureDatabaseFile() {
    if (!fs.existsSync(this.dbFilePath)) {
      fs.writeFileSync(this.dbFilePath, "");
    }
  }

  private openDatabase() {
    try {
      this.db = new Database(this.dbFilePath, { create: true, strict: true });
      this.db.run("PRAGMA foreign_keys = ON;");
    } catch (e) {
      // Don't continue with an undefined connection
      throw new Error(
        `Failed to open SQLite database at ${this.dbFilePath}: ${(e as Error).message}`,
        { cause: e },
      );
    }
  }
}
