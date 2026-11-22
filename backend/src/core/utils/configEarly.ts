import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as net from "net";
import * as path from "path";
import type { ListenInfo } from "@shared/types/configs/mainConfig.types";

const DEFAULT_PORT = 8000;
// First run walks up to this port when the default one is taken
const LAST_FALLBACK_PORT = 8010;

let listen: ListenInfo = { port: DEFAULT_PORT, fromEnv: false };

/** Port the panel listens on until restart, a saved change applies only then */
export const listenInfo = (): ListenInfo => listen;

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

async function firstFreePort(): Promise<number> {
  for (let port = DEFAULT_PORT; port <= LAST_FALLBACK_PORT; port++) {
    if (await isPortFree(port)) return port;
  }
  // Nothing free, let listen() fail with the usual error
  return DEFAULT_PORT;
}

/**
 * Port to listen on, read before Nest init. PORT env and a saved port are used as is,
 * on the first run the first free one from 8000 to 8010 is picked and saved
 */
export async function resolvePortBeforeNestInit(): Promise<number> {
  const dbFilePath = path.join(process.cwd(), "db.sql");
  if (!fs.existsSync(dbFilePath)) fs.writeFileSync(dbFilePath, "");

  const db = new Database(dbFilePath, { create: true, strict: true });
  try {
    db.run("PRAGMA foreign_keys = ON;");
    db.run("CREATE TABLE IF NOT EXISTS config_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);");

    const envPort = Number(process.env.PORT);
    if (process.env.PORT && Number.isFinite(envPort)) {
      listen = { port: envPort, fromEnv: true };
      return envPort;
    }

    const row = db.query("SELECT value FROM config_kv WHERE key = ?").get("port") as { value: string } | undefined;
    if (row) {
      const saved = Number(row.value);
      listen = { port: Number.isFinite(saved) ? saved : DEFAULT_PORT, fromEnv: false };
      return listen.port;
    }

    // Saved right away so the next start stays on the same address
    const port = await firstFreePort();
    db.run("INSERT OR IGNORE INTO config_kv (key, value) VALUES ('port', ?)", [String(port)]);
    listen = { port, fromEnv: false };
    return port;
  } finally {
    db.close();
  }
}
