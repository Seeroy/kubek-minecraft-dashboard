import type { Database } from "bun:sqlite";

// Where a server made from a modpack came from, kept for a future pack update
export function serverModpacks(db: Database): void {
  db.run(`CREATE TABLE server_modpacks (
    serverId TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('file', 'modrinth')),
    projectId TEXT,
    versionId TEXT,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    installedAt INTEGER NOT NULL
  )`);
}
