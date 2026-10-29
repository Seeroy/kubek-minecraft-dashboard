// Access guards against a fresh panel in a temp folder with two Paper servers
// Needs the internet for Paper. E2E_PAPER_VERSION picks the line, E2E_KEEP_DIR keeps the folder

import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Subprocess } from "bun";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { io, type Socket } from "socket.io-client";
import {
  AccessArea,
  type AccessLevel,
  type AccessMap,
  AREA_LEVELS,
  levelAtLeast,
  SERVER_AREAS,
} from "@shared/access/areas";
import { log, sleep } from "./helpers";

const VERSION_LINE = process.env.E2E_PAPER_VERSION ?? "26.1";
const PORT = Number(process.env.E2E_RBAC_PANEL_PORT ?? 18126);
const GAME_PORT = Number(process.env.E2E_RBAC_GAME_PORT ?? 25597);
const BASE = `http://127.0.0.1:${PORT}`;
const BACKEND = path.resolve(__dirname, "..");
const ADMIN_PASSWORD = "Kubek2026";
const PASSWORD = "Rbac2026!";
const GHOST = "00000000-0000-0000-0000-000000000000";

let dir: string;
let backend: Subprocess;
let admin: string;
let serverA: string;
let serverB: string;
let javaMajor: number;
const sockets: Socket[] = [];

interface Reply {
  status: number;
  body: any;
}

interface Payload {
  json?: unknown;
  form?: FormData;
}

async function call(
  method: string,
  endpoint: string,
  token?: string,
  payload: Payload = {},
): Promise<Reply> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: string | FormData | undefined = payload.form;
  if (payload.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload.json);
  }
  const res = await fetch(`${BASE}${endpoint}`, { method, headers, body });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // not json, keep the text
  }
  return { status: res.status, body: parsed };
}

// Successful responses come wrapped as { success, data }
async function ok(
  method: string,
  endpoint: string,
  token: string,
  payload?: Payload,
): Promise<any> {
  const reply = await call(method, endpoint, token, payload);
  if (reply.status >= 300) {
    throw new Error(
      `${method} ${endpoint} -> ${reply.status} ${JSON.stringify(reply.body)}`,
    );
  }
  return reply.body?.data ?? reply.body;
}

async function login(username: string, password = PASSWORD): Promise<string> {
  const res = await ok("POST", "/api/auth/login", "", {
    json: { username, password },
  });
  return res.token;
}

async function waitTask(taskId: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    const task = await ok("GET", `/api/tasks/${taskId}`, admin);
    const now = `${task.step ?? task.status} ${task.progress ?? 0}%`;
    if (now !== last) log.info(now);
    last = now;
    if (task.status === "success") return;
    if (task.status === "failed") {
      throw new Error(`task ${taskId} failed: ${JSON.stringify(task.error)}`);
    }
    await sleep(1500);
  }
  throw new Error(`task ${taskId} still running after ${timeoutMs / 1000}s`);
}

interface AccountSpec {
  roles?: string[];
  grants?: AccessMap;
  servers?: string[];
}

/** Creates the account as admin and logs it in */
async function account(username: string, spec: AccountSpec): Promise<string> {
  await ok("POST", "/api/accounts", admin, {
    json: { username, password: PASSWORD, ...spec },
  });
  return login(username);
}

async function role(name: string, grants: AccessMap): Promise<string> {
  const created = await ok("POST", "/api/roles", admin, {
    json: { name, grants },
  });
  return created.id;
}

type Need = { area: AccessArea; level: AccessLevel } | "serverView";

interface Probe {
  need: Need;
  method: string;
  path: () => string;
  /** What the call returns once the guards let it through */
  passes: number;
  payload?: () => Payload;
}

function check(
  need: Need,
  method: string,
  path: () => string,
  passes: number,
  payload?: () => Payload,
): Probe {
  return { need, method, path, passes, payload };
}

const at = (area: AccessArea, level: AccessLevel): Need => ({ area, level });
const json = (body: unknown) => () => ({ json: body });
const A = AccessArea;

function emptyCreateForm(): FormData {
  const form = new FormData();
  form.append("payload", "{}");
  return form;
}

// Guard-passing calls stop at validation or a missing id, so none of them changes anything
// prettier-ignore
const PROBES: Probe[] = [
  check("serverView", "GET", () => `/api/servers/${GHOST}`, 404),
  check(at(A.POWER, "write"), "POST", () => `/api/servers/${GHOST}/start`, 404, json({})),
  check(at(A.POWER, "manage"), "POST", () => `/api/servers/${GHOST}/kill`, 404, json({})),
  check(at(A.SETTINGS, "read"), "GET", () => `/api/servers/${GHOST}/properties`, 404),
  check(at(A.SETTINGS, "write"), "PATCH", () => `/api/servers/${GHOST}/settings`, 404, json({})),
  check(at(A.SETTINGS, "manage"), "POST", () => "/api/servers/bulk-delete", 400, json({})),
  check(at(A.FILES, "read"), "GET", () => `/api/files/scan?serverId=${GHOST}&path=/`, 404),
  check(at(A.FILES, "write"), "POST", () => "/api/files/directory", 400, json({ serverId: GHOST })),
  check(at(A.FILES, "manage"), "POST", () => "/api/files/batch-delete", 400, json({ serverId: GHOST })),
  check(at(A.CONTENT, "read"), "GET", () => `/api/plugins/installed/${GHOST}`, 404),
  check(at(A.CONTENT, "write"), "POST", () => "/api/plugins/install", 400, json({ serverId: GHOST })),
  check(at(A.CONTENT, "manage"), "DELETE", () => `/api/plugins/servers/${GHOST}/plugins/ghost`, 404),
  check(at(A.PLAYERS, "read"), "GET", () => `/api/servers/${GHOST}/players`, 404),
  check(at(A.PLAYERS, "write"), "POST", () => `/api/servers/${GHOST}/players/whitelist`, 400, json({})),
  check(at(A.PLAYERS, "manage"), "POST", () => `/api/servers/${GHOST}/players/ops`, 400, json({})),
  check(at(A.BACKUPS, "read"), "GET", () => "/api/backups", 200),
  check(at(A.BACKUPS, "write"), "POST", () => "/api/backups", 400, json({ serverId: GHOST })),
  check(at(A.BACKUPS, "manage"), "DELETE", () => `/api/backups/${GHOST}`, 404),
  check(at(A.SCHEDULER, "read"), "GET", () => `/api/servers/${GHOST}/scheduled-tasks`, 200),
  check(at(A.SCHEDULER, "write"), "POST", () => `/api/servers/${GHOST}/scheduled-tasks`, 400, json({})),
  check(at(A.SCHEDULER, "manage"), "DELETE", () => `/api/scheduled-tasks/${GHOST}`, 404),
  check(at(A.SERVERS, "write"), "POST", () => "/api/servers", 400, () => ({ form: emptyCreateForm() })),
  check(at(A.SERVERS, "manage"), "POST", () => "/api/server-folders", 400, json({})),
  check(at(A.NETWORKS, "read"), "GET", () => "/api/networks", 200),
  check(at(A.NETWORKS, "write"), "POST", () => "/api/networks/plan", 400, json({})),
  check(at(A.NETWORKS, "manage"), "DELETE", () => `/api/networks/${GHOST}`, 404),
  check(at(A.ACCOUNTS, "read"), "GET", () => "/api/accounts", 200),
  check(at(A.ACCOUNTS, "write"), "POST", () => "/api/accounts", 400, json({})),
  check(at(A.ACCOUNTS, "manage"), "POST", () => "/api/roles", 400, json({})),
  check(at(A.AUDIT, "read"), "GET", () => "/api/audit-logs", 200),
  check(at(A.AUDIT, "manage"), "POST", () => "/api/audit-logs/retention/preview", 200, json({})),
  check(at(A.MONITORING, "read"), "GET", () => "/api/system-monitoring/info", 200),
  check(at(A.JAVA, "read"), "GET", () => "/api/java", 200),
  // Java of the created server is already there, so the task ends without a download
  check(at(A.JAVA, "write"), "POST", () => `/api/java/install/${javaMajor}`, 202, json({})),
  check(at(A.JAVA, "manage"), "POST", () => "/api/java/custom/validate", 400, json({})),
  check(at(A.STORAGES, "read"), "GET", () => "/api/backup-storages", 200),
  check(at(A.STORAGES, "manage"), "POST", () => "/api/backup-storages/test", 400, json({})),
  check(at(A.INTEGRATIONS, "manage"), "GET", () => "/api/extensions", 200),
  check(at(A.ASSISTANT, "read"), "GET", () => "/api/assistant/status", 200),
  check(at(A.ASSISTANT, "manage"), "GET", () => "/api/assistant/settings", 200),
  check(at(A.PANEL, "manage"), "GET", () => "/api/kubek/config", 200),
];

function allowed(probe: Probe, levels: AccessMap): boolean {
  if (probe.need === "serverView") {
    return SERVER_AREAS.some((area) => levels[area]);
  }
  return levelAtLeast(levels[probe.need.area], probe.need.level);
}

function describeNeed(n: Need): string {
  return n === "serverView" ? "server view" : `${n.area} ${n.level}`;
}

/** Every probe whose status isn't what the levels predict, empty when all match */
async function mismatches(token: string, levels: AccessMap): Promise<string[]> {
  const wrong: string[] = [];
  for (const probe of PROBES) {
    const want = allowed(probe, levels) ? probe.passes : 403;
    const { status, body } = await call(
      probe.method,
      probe.path(),
      token,
      probe.payload?.(),
    );
    if (status !== want) {
      wrong.push(
        `${describeNeed(probe.need)}: ${probe.method} ${probe.path()} -> ${status}, want ${want} (${body?.message ?? ""})`,
      );
    }
  }
  return wrong;
}

type Case = [
  method: string,
  endpoint: string,
  status: number,
  payload?: Payload,
];

async function expectStatuses(token: string, cases: Case[]): Promise<void> {
  const got: string[] = [];
  for (const [method, endpoint, , payload] of cases) {
    const { status } = await call(method, endpoint, token, payload);
    got.push(`${method} ${endpoint} ${status}`);
  }
  expect(got).toEqual(cases.map(([m, e, s]) => `${m} ${e} ${s}`));
}

function connect(
  token: string,
): Promise<{ socket: Socket; serverIds: string[] }> {
  const socket = io(BASE, {
    transports: ["websocket"],
    auth: { authorization: `Bearer ${token}` },
  });
  sockets.push(socket);
  return new Promise((resolve) =>
    socket.once("server:list", (list: { id: string }[]) =>
      resolve({ socket, serverIds: list.map((s) => s.id) }),
    ),
  );
}

async function subscribe(socket: Socket, room: string): Promise<boolean> {
  const ack = await socket.timeout(5000).emitWithAck("room:subscribe", room);
  return ack.ok;
}

async function waitFor<T>(
  what: string,
  timeoutMs: number,
  probe: () => Promise<T | undefined>,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe().catch(() => undefined);
    if (value !== undefined) return value;
    await sleep(500);
  }
  throw new Error(`${what}: nothing after ${timeoutMs / 1000}s`);
}

async function createServers(): Promise<void> {
  const offered: string[] = await ok(
    "GET",
    "/api/server-types/com.kubek.paper/versions",
    admin,
  );
  const version = offered.find(
    (v) => v === VERSION_LINE || v.startsWith(`${VERSION_LINE}.`),
  );
  if (!version) throw new Error(`no Paper ${VERSION_LINE} offered`);
  javaMajor = await ok("GET", `/api/java/${version}`, admin);

  const form = new FormData();
  form.append(
    "payload",
    JSON.stringify({
      name: "rbac-a",
      blueprintId: "com.kubek.paper",
      runtime: "native",
      variables: {
        GAME_VERSION: version,
        JAVA_VERSION: javaMajor,
        XMX: 1024,
        XMS: 512,
        game: GAME_PORT,
      },
    }),
  );
  log.step(
    `Creating Paper ${version}, downloads Java ${javaMajor} and the core`,
  );
  const created = await ok("POST", "/api/servers", admin, { form });
  serverA = created.server.id;
  await waitTask(created.taskId, 15 * 60_000);

  const copy = await ok("POST", `/api/servers/${serverA}/duplicate`, admin, {
    json: { name: "rbac-b" },
  });
  serverB = copy.server.id;
  await waitTask(copy.taskId, 5 * 60_000);
  log.ok(`paper ${version} on java ${javaMajor}: A=${serverA} B=${serverB}`);
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-rbac-e2e-"));
  log.step(`Backend in ${dir}`);
  const output = fs.openSync(path.join(dir, "backend.log"), "a");
  backend = Bun.spawn(
    [
      "bun",
      `--tsconfig-override=${path.join(BACKEND, "tsconfig.json")}`,
      path.join(BACKEND, "src/main.ts"),
    ],
    {
      cwd: dir,
      env: { ...process.env, NODE_ENV: "development", PORT: String(PORT) },
      stdout: output,
      stderr: output,
    },
  );
  await waitFor("backend health", 60_000, async () =>
    (await call("GET", "/api/health")).status === 200 ? true : undefined,
  );
  log.ok("backend is up");

  admin = await login("kubek", ADMIN_PASSWORD);
  await ok("GET", "/api/kubek/acceptEULA", admin);
  await ok("POST", "/api/auth/complete-oobe", admin);
  await createServers();
}, 20 * 60_000);

afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  backend?.kill();
  await backend?.exited;
  if (process.env.E2E_KEEP_DIR) log.info(`kept ${dir}`);
  else if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

test("viewer role restricted to server A reads A and nothing else", async () => {
  const token = await account("rbac_viewer", {
    roles: ["builtin:viewer"],
    servers: [serverA],
  });
  await expectStatuses(token, [
    ["GET", `/api/servers/${serverA}`, 200],
    ["GET", `/api/servers/${serverA}/players`, 200],
    ["GET", `/api/servers/${serverA}/properties`, 200],
    ["GET", `/api/plugins/installed/${serverA}`, 200],
    ["GET", `/api/servers/${serverA}/scheduled-tasks`, 200],
    ["GET", `/api/backups/server/${serverA}`, 200],
    ["GET", "/api/networks", 200],
    ["GET", `/api/servers/${serverB}`, 403],
    ["POST", `/api/servers/${serverA}/start`, 403, { json: {} }],
    ["PATCH", `/api/servers/${serverA}/settings`, 403, { json: {} }],
    ["POST", `/api/servers/${serverA}/players/whitelist`, 403, { json: {} }],
    ["GET", `/api/files/scan?serverId=${serverA}&path=/`, 403],
    ["GET", "/api/accounts", 403],
    ["GET", "/api/java", 403],
  ]);
});

test("moderator role controls power and players but not settings or files", async () => {
  const token = await account("rbac_moderator", {
    roles: ["builtin:moderator"],
  });
  await expectStatuses(token, [
    ["POST", `/api/servers/${GHOST}/start`, 404, { json: {} }],
    ["POST", `/api/servers/${GHOST}/players/ops`, 400, { json: {} }],
    ["POST", `/api/servers/${GHOST}/players/bans`, 400, { json: {} }],
    ["GET", `/api/servers/${serverB}/properties`, 200],
    ["POST", `/api/servers/${GHOST}/kill`, 403, { json: {} }],
    ["PATCH", `/api/servers/${GHOST}/settings`, 403, { json: {} }],
    ["GET", `/api/files/scan?serverId=${serverA}&path=/`, 403],
    ["POST", "/api/backups", 403, { json: { serverId: GHOST } }],
    ["POST", "/api/servers", 403, { form: emptyCreateForm() }],
  ]);
});

test("operator role edits settings, files, content and backups without manage rights", async () => {
  const token = await account("rbac_operator", { roles: ["builtin:operator"] });
  await expectStatuses(token, [
    ["PATCH", `/api/servers/${GHOST}/settings`, 404, { json: {} }],
    ["GET", `/api/files/scan?serverId=${serverA}&path=/`, 200],
    ["POST", "/api/files/directory", 400, { json: { serverId: GHOST } }],
    ["POST", "/api/plugins/install", 400, { json: { serverId: GHOST } }],
    ["POST", "/api/backups", 400, { json: { serverId: GHOST } }],
    ["POST", `/api/servers/${GHOST}/scheduled-tasks`, 400, { json: {} }],
    ["POST", `/api/servers/${GHOST}/core`, 403, { json: {} }],
    ["POST", "/api/files/batch-delete", 403, { json: { serverId: GHOST } }],
    ["DELETE", `/api/backups/${GHOST}`, 403],
    ["POST", `/api/servers/${GHOST}/kill`, 403, { json: {} }],
    ["POST", "/api/servers", 403, { form: emptyCreateForm() }],
  ]);
});

test("server admin role manages servers and installs java but stays out of the panel", async () => {
  const token = await account("rbac_server_admin", {
    roles: ["builtin:server-admin"],
  });
  await expectStatuses(token, [
    ["POST", `/api/servers/${GHOST}/kill`, 404, { json: {} }],
    ["POST", "/api/files/batch-delete", 400, { json: { serverId: GHOST } }],
    ["DELETE", `/api/backups/${GHOST}`, 404],
    ["POST", "/api/servers", 400, { form: emptyCreateForm() }],
    ["POST", "/api/server-folders", 400, { json: {} }],
    ["DELETE", `/api/networks/${GHOST}`, 404],
    ["GET", "/api/java", 200],
    ["POST", "/api/java/custom/validate", 403, { json: {} }],
    ["GET", "/api/accounts", 403],
    ["GET", "/api/kubek/config", 403],
    ["GET", "/api/audit-logs", 403],
  ]);
});

test("each area level opens its own and lower probes and nothing above or elsewhere", async () => {
  // One account on a role whose levels change per step, editing a role keeps the session
  const roleId = await role("matrix", {});
  const token = await account("rbac_matrix", { roles: [roleId] });

  const wrong: string[] = [];
  for (const area of Object.values(AccessArea)) {
    for (const level of AREA_LEVELS[area]) {
      const levels: AccessMap = { [area]: level };
      await ok("PUT", `/api/roles/${roleId}`, admin, {
        json: { grants: levels },
      });
      const found = await mismatches(token, levels);
      wrong.push(...found.map((line) => `[${area} ${level}] ${line}`));
    }
  }
  expect(wrong).toEqual([]);
}, 120_000);

test("server list restriction hides server B everywhere", async () => {
  const token = await account("rbac_restricted", {
    grants: { power: "manage", files: "read" },
    servers: [serverA],
  });
  const list: { id: string }[] = await ok("GET", "/api/servers", token);
  expect(list.map((s) => s.id)).toEqual([serverA]);
  await expectStatuses(token, [
    ["GET", `/api/servers/${serverA}`, 200],
    ["GET", `/api/files/scan?serverId=${serverA}&path=/`, 200],
    ["GET", `/api/servers/${serverB}`, 403],
    ["GET", `/api/servers/${serverB}/diagnostics`, 403],
    ["GET", `/api/files/scan?serverId=${serverB}&path=/`, 403],
    ["POST", `/api/servers/${serverB}/start`, 403, { json: {} }],
    ["POST", `/api/servers/${serverB}/kill`, 403, { json: {} }],
  ]);

  const { socket, serverIds } = await connect(token);
  expect(serverIds).toEqual([serverA]);
  expect(await subscribe(socket, `server:${serverA}`)).toBe(true);
  expect(await subscribe(socket, `server:${serverB}`)).toBe(false);
});

test("any server area opens the server list, a panel area alone does not", async () => {
  const files = await account("rbac_files_only", { grants: { files: "read" } });
  const list: { id: string }[] = await ok("GET", "/api/servers", files);
  expect(list.map((s) => s.id).sort()).toEqual([serverA, serverB].sort());
  expect((await call("GET", `/api/servers/${serverB}`, files)).status).toBe(
    200,
  );

  const audit = await account("rbac_audit_only", { grants: { audit: "read" } });
  await expectStatuses(audit, [
    ["GET", "/api/audit-logs", 200],
    ["GET", "/api/servers", 403],
    ["GET", `/api/servers/${serverA}`, 403],
    ["GET", "/api/tasks", 403],
    ["GET", "/api/server-folders", 403],
  ]);
});

test("account writers can't give access they lack, touch admins or edit roles", async () => {
  const token = await account("rbac_account_writer", {
    grants: { accounts: "write", files: "read" },
  });

  const within = await call("POST", "/api/accounts", token, {
    json: {
      username: "rbac_within",
      password: PASSWORD,
      grants: { files: "read" },
    },
  });
  expect(within.status).toBe(201);

  const refusals = [
    await call("POST", "/api/accounts", token, {
      json: {
        username: "rbac_above",
        password: PASSWORD,
        grants: { files: "manage" },
      },
    }),
    await call("POST", "/api/accounts", token, {
      json: {
        username: "rbac_above_role",
        password: PASSWORD,
        roles: ["builtin:viewer"],
      },
    }),
    await call("PUT", "/api/accounts/kubek", token, {
      json: { password: "Hijacked2026" },
    }),
    await call("DELETE", "/api/accounts/kubek", token),
  ];
  expect(refusals.map((r) => [r.status, r.body?.code])).toEqual(
    refusals.map(() => [403, "ACCESS_ESCALATION"]),
  );

  await expectStatuses(token, [
    ["GET", "/api/roles", 200],
    ["POST", "/api/roles", 403, { json: { name: "sneaky", grants: {} } }],
    ["PUT", "/api/roles/builtin:viewer", 403, { json: { grants: {} } }],
    ["DELETE", "/api/roles/builtin:viewer", 403],
    ["POST", "/api/roles/builtin:viewer/duplicate", 403, { json: {} }],
  ]);
  expect((await call("GET", "/api/accounts/rbac_above", admin)).status).toBe(
    404,
  );
});

test("admin creates, renames, duplicates and deletes roles, built-ins stay fixed", async () => {
  const created = await ok("POST", "/api/roles", admin, {
    json: { name: "Builders", grants: { files: "read" } },
  });
  expect(created).toMatchObject({
    name: "Builders",
    builtin: false,
    grants: { files: "read" },
  });

  const renamed = await ok("PUT", `/api/roles/${created.id}`, admin, {
    json: { name: "Architects" },
  });
  expect(renamed).toMatchObject({
    name: "Architects",
    grants: { files: "read" },
  });

  const builtinRename = await call("PUT", "/api/roles/builtin:viewer", admin, {
    json: { name: "Watchers" },
  });
  expect([builtinRename.status, builtinRename.body?.code]).toEqual([
    400,
    "ROLE_BUILTIN",
  ]);
  const builtinDelete = await call(
    "DELETE",
    "/api/roles/builtin:viewer",
    admin,
  );
  expect([builtinDelete.status, builtinDelete.body?.code]).toEqual([
    400,
    "ROLE_BUILTIN",
  ]);

  const operator = await ok("GET", "/api/roles/builtin:operator", admin);
  const copy = await ok(
    "POST",
    "/api/roles/builtin:operator/duplicate",
    admin,
    {
      json: {},
    },
  );
  expect(copy.id).not.toBe(operator.id);
  expect(copy).toMatchObject({ builtin: false, grants: operator.grants });

  expect((await call("DELETE", `/api/roles/${created.id}`, admin)).status).toBe(
    204,
  );
  expect((await call("DELETE", `/api/roles/${copy.id}`, admin)).status).toBe(
    204,
  );
  expect((await call("GET", `/api/roles/${created.id}`, admin)).status).toBe(
    404,
  );
  const ids = (await ok("GET", "/api/roles", admin)).map(
    (r: { id: string }) => r.id,
  );
  expect(ids).toEqual(
    expect.arrayContaining([
      "builtin:viewer",
      "builtin:moderator",
      "builtin:operator",
      "builtin:server-admin",
    ]),
  );
});

test("editing a role changes its members' access on their next request", async () => {
  const roleId = await role("auditors", { audit: "read" });
  const token = await account("rbac_role_member", { roles: [roleId] });
  await expectStatuses(token, [
    ["GET", "/api/audit-logs", 200],
    ["GET", "/api/java", 403],
  ]);

  await ok("PUT", `/api/roles/${roleId}`, admin, {
    json: { grants: { java: "read" } },
  });
  await expectStatuses(token, [
    ["GET", "/api/audit-logs", 403],
    ["GET", "/api/java", 200],
  ]);

  await ok("DELETE", `/api/roles/${roleId}`, admin);
  expect((await call("GET", "/api/java", token)).status).toBe(403);
});

test("console log reaches console readers only and commands need console write", async () => {
  const power = await connect(
    await account("rbac_ws_power", { grants: { power: "read" } }),
  );
  const reader = await connect(
    await account("rbac_ws_reader", { grants: { console: "read" } }),
  );
  const writer = await connect(
    await account("rbac_ws_writer", { grants: { console: "write" } }),
  );
  const outsider = await connect(
    await account("rbac_ws_outsider", { grants: { audit: "read" } }),
  );

  expect(outsider.serverIds).toEqual([]);
  expect(await subscribe(outsider.socket, `server:${serverB}`)).toBe(false);
  for (const client of [power, reader, writer]) {
    expect(await subscribe(client.socket, `server:${serverB}`)).toBe(true);
  }

  const powerLines: unknown[] = [];
  const readerLines: {
    data?: { type?: string; username?: string; command?: string };
  }[] = [];
  const statuses: string[] = [];
  power.socket.on("server:log_update", (entry) => powerLines.push(entry));
  power.socket.on("server:status_update", (event) =>
    statuses.push(event.status.status),
  );
  reader.socket.on("server:log_update", (entry) => readerLines.push(entry));
  const typed = () =>
    readerLines
      .filter((line) => line.data?.type === "user_input")
      .map((line) => `${line.data?.username}: ${line.data?.command}`);

  // Commands only land while the process runs, so B is started and killed right away
  await ok("POST", `/api/servers/${serverB}/start`, admin, { json: {} });
  try {
    await waitFor("console line for the reader", 30_000, async () =>
      readerLines.length > 0 ? true : undefined,
    );
    reader.socket.emit("server:client:submit_cmd", {
      serverId: serverB,
      command: "help",
    });
    writer.socket.emit("server:client:submit_cmd", {
      serverId: serverB,
      command: "list",
    });
    await waitFor("writer's command in the log", 15_000, async () =>
      typed().length > 0 ? true : undefined,
    );
    await sleep(500);
    expect(typed()).toEqual(["rbac_ws_writer: list"]);
  } finally {
    await call("POST", `/api/servers/${serverB}/kill`, admin, { json: {} });
    await waitFor("server B down", 60_000, async () => {
      const server = await ok("GET", `/api/servers/${serverB}`, admin);
      return ["stopped", "crashed"].includes(server.status) ? true : undefined;
    });
  }

  expect(statuses).toContain("starting");
  expect(powerLines).toEqual([]);
}, 120_000);
