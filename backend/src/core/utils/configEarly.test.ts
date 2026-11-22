import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "fs";
import * as net from "net";
import { tmpdir } from "os";
import { join } from "path";
import { listenInfo, resolvePortBeforeNestInit } from "./configEarly";

const savedPort = (dir: string) => {
  const db = new Database(join(dir, "db.sql"));
  const row = db.query("SELECT value FROM config_kv WHERE key = 'port'").get() as { value: string } | null;
  db.close();
  return row?.value ?? null;
};

const occupy = (port: number) =>
  new Promise<net.Server | null>((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(null));
    server.listen(port, () => resolve(server));
  });

describe("resolvePortBeforeNestInit", () => {
  const cwd = process.cwd();
  const envPort = process.env.PORT;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "kubek-port-"));
    process.chdir(dir);
    delete process.env.PORT;
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    if (envPort === undefined) delete process.env.PORT;
    else process.env.PORT = envPort;
  });

  test("PORT env wins and is not saved", async () => {
    process.env.PORT = "9123";
    expect(await resolvePortBeforeNestInit()).toBe(9123);
    expect(savedPort(dir)).toBeNull();
    expect(listenInfo()).toEqual({ port: 9123, fromEnv: true });
  });

  test("a saved port is used as is", async () => {
    const db = new Database(join(dir, "db.sql"), { create: true });
    db.run("CREATE TABLE config_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.run("INSERT INTO config_kv (key, value) VALUES ('port', '8123')");
    db.close();
    expect(await resolvePortBeforeNestInit()).toBe(8123);
    expect(listenInfo()).toEqual({ port: 8123, fromEnv: false });
  });

  test("first run skips a busy port and saves the picked one", async () => {
    const first = await resolvePortBeforeNestInit();
    rmSync(join(dir, "db.sql"));
    // Hold the port the first run got, the next fresh run has to move past it
    const held = await occupy(first);
    try {
      const port = await resolvePortBeforeNestInit();
      expect(port).toBeGreaterThan(first);
      expect(port).toBeLessThanOrEqual(8010);
      expect(savedPort(dir)).toBe(String(port));
    } finally {
      held?.close();
    }
  });
});
