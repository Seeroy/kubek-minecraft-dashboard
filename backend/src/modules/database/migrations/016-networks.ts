import type { Database } from "bun:sqlite";

// Velocity networks, the forwarding secret stays in the proxy folder
export function networks(db: Database): void {
  db.run(`CREATE TABLE networks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    proxyServerId TEXT NOT NULL UNIQUE REFERENCES servers(id) ON DELETE CASCADE,
    forwardingMode TEXT NOT NULL CHECK (forwardingMode IN ('modern', 'legacy')),
    createdAt INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE network_members (
    serverId TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    networkId TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    tryOrder INTEGER CHECK (tryOrder IS NULL OR tryOrder >= 0),
    UNIQUE (networkId, alias),
    UNIQUE (networkId, tryOrder)
  )`);
}
