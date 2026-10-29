// Fresh panel in a temp folder, Paper with real Java and core downloads. Needs the internet
// E2E_PAPER_VERSION picks the line, E2E_KEEP_DIR keeps the folder

import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Subprocess } from "bun";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { io, type Socket } from "socket.io-client";

const VERSION_LINE = process.env.E2E_PAPER_VERSION ?? "26.1";
const PORT = Number(process.env.E2E_PAPER_PANEL_PORT ?? 18125);
const GAME_PORT = Number(process.env.E2E_PAPER_GAME_PORT ?? 25599);
const PASSWORD = "Kubek2026";
const BACKEND = path.resolve(__dirname, "..");

// helpers read BASE_URL on import
process.env.BASE_URL = `http://127.0.0.1:${PORT}`;
const h = await import("./helpers");

let dir: string;
let backend: Subprocess;
let socket: Socket | undefined;

async function waitFor<T>(
  what: string,
  timeoutMs: number,
  probe: () => Promise<T | undefined>,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe().catch(() => undefined);
    if (value !== undefined) return value;
    await h.sleep(1000);
  }
  throw new Error(`${what}: nothing after ${timeoutMs / 1000}s`);
}

function consoleLine(pattern: RegExp, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket!.off("server:log_update", onLine);
      reject(new Error(`console never printed ${pattern}`));
    }, timeoutMs);
    const onLine = (entry: { line?: string }) => {
      if (!entry.line || !pattern.test(entry.line)) return;
      clearTimeout(timer);
      socket!.off("server:log_update", onLine);
      resolve(entry.line);
    };
    socket!.on("server:log_update", onLine);
  });
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-paper-e2e-"));
  h.log.step(`Backend in ${dir}`);
  backend = Bun.spawn(
    [
      "bun",
      `--tsconfig-override=${path.join(BACKEND, "tsconfig.json")}`,
      path.join(BACKEND, "src/main.ts"),
    ],
    {
      cwd: dir,
      env: { ...process.env, NODE_ENV: "development", PORT: String(PORT) },
      stdout: fs.openSync(path.join(dir, "backend.log"), "a"),
      stderr: fs.openSync(path.join(dir, "backend.log"), "a"),
    },
  );
  await waitFor("backend health", 60_000, async () =>
    (await h.statusOf("GET", "/api/health")) === 200 ? true : undefined,
  );
  h.log.ok("backend is up");
}, 90_000);

afterAll(async () => {
  socket?.disconnect();
  backend?.kill();
  await backend?.exited;
  if (process.env.E2E_KEEP_DIR) h.log.info(`kept ${dir}`);
  else fs.rmSync(dir, { recursive: true, force: true });
});

test(
  `Paper ${VERSION_LINE}: java, install, start, command, stop, delete`,
  async () => {
    const { token } = await h.login("kubek", PASSWORD);
    await h.completeOnboarding(token);

    h.log.step("Pick the version");
    const offered: string[] = h.unwrap(
      await h.api("GET", "/api/server-types/com.kubek.paper/versions", {
        token,
      }),
    );
    const version = offered.find(
      (v) => v === VERSION_LINE || v.startsWith(`${VERSION_LINE}.`),
    );
    expect(version).toBeString();
    const java: number = h.unwrap(
      await h.api("GET", `/api/java/${version}`, { token }),
    );
    expect(java).toBeGreaterThanOrEqual(21);
    h.log.ok(`paper ${version} on java ${java}`);

    h.log.step("Create, downloads java and the core");
    const form = new FormData();
    form.append(
      "payload",
      JSON.stringify({
        name: "paper-e2e",
        blueprintId: "com.kubek.paper",
        runtime: "native",
        variables: {
          GAME_VERSION: version,
          JAVA_VERSION: java,
          XMX: 2048,
          XMS: 1024,
          game: GAME_PORT,
        },
      }),
    );
    const created = h.unwrap(
      await h.api("POST", "/api/servers", { token, form }),
    );
    const id: string = created.server.id;
    await h.waitTask(token, created.taskId, "create", 15 * 60_000);
    const folder = path.join(dir, "servers", id);
    expect(fs.existsSync(path.join(folder, "server.jar"))).toBe(true);
    expect(fs.readdirSync(path.join(dir, "binaries", "java"))).not.toEqual([]);

    h.log.step("Start and wait for Done");
    socket = io(h.BASE, {
      transports: ["websocket"],
      auth: { authorization: `Bearer ${token}` },
    });
    await new Promise((resolve) => socket!.once("server:list", resolve));
    socket.emit("room:subscribe", `server:${id}`);
    const done = consoleLine(/Done \(\d+[.,]\d+s\)!/, 5 * 60_000);
    await h.api("POST", `/api/servers/${id}/start`, { token, json: {} });
    h.log.ok(await done);
    await waitFor("running status", 60_000, async () => {
      const s = h.unwrap(await h.api("GET", `/api/servers/${id}`, { token }));
      return s.status === "running" ? s : undefined;
    });

    h.log.step("Console command reaches the server");
    const answer = consoleLine(
      /There are 0 of a max of \d+ players online/,
      30_000,
    );
    socket.emit("server:client:submit_cmd", { serverId: id, command: "list" });
    h.log.ok(await answer);

    h.log.step("Stop");
    await h.api("POST", `/api/servers/${id}/stop`, { token, json: {} });
    await waitFor("stopped status", 2 * 60_000, async () => {
      const s = h.unwrap(await h.api("GET", `/api/servers/${id}`, { token }));
      return s.status === "stopped" ? s : undefined;
    });
    expect(fs.existsSync(path.join(folder, "world", "level.dat"))).toBe(true);

    h.log.step("Delete");
    await h.api("DELETE", `/api/servers/${id}`, {
      token,
      json: { password: PASSWORD, confirmName: "paper-e2e" },
    });
    expect(await h.statusOf("GET", `/api/servers/${id}`, { token })).toBe(404);
    expect(fs.existsSync(folder)).toBe(false);
  },
  25 * 60_000,
);
