import type { Database } from "bun:sqlite";
import { count } from "./migration.types";

// Plugins and mods were two identical tables, now one with a kind column
export function serverContent(db: Database): void {
  db.run(`CREATE TABLE server_content (
    id TEXT PRIMARY KEY,
    serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('plugin', 'mod')),
    projectId TEXT NOT NULL,
    versionId TEXT NOT NULL,
    fileName TEXT NOT NULL,
    fileHash TEXT,
    dependencyOf TEXT REFERENCES server_content(id) ON DELETE SET NULL,
    installedAt INTEGER NOT NULL,
    updatedAt INTEGER
  )`);
  db.run(
    "CREATE UNIQUE INDEX idx_server_content_server_kind_project ON server_content (serverId, kind, projectId)",
  );
  db.run(
    "CREATE INDEX idx_server_content_dependency_of ON server_content (dependencyOf)",
  );

  const expected = count(db, "server_plugins") + count(db, "server_mods");
  for (const [table, kind] of [
    ["server_plugins", "plugin"],
    ["server_mods", "mod"],
  ]) {
    db.run(`INSERT INTO server_content
      (id, serverId, kind, projectId, versionId, fileName, fileHash, dependencyOf, installedAt, updatedAt)
      SELECT id, serverId, '${kind}', projectId, versionId, fileName, fileHash, dependencyOf, installedAt, updatedAt
        FROM ${table}`);
  }

  const copied = count(db, "server_content");
  if (copied !== expected) {
    throw new Error(`server_content: copied ${copied} of ${expected} rows`);
  }

  db.run("DROP TABLE server_plugins");
  db.run("DROP TABLE server_mods");
}
