// TOTALLY VIBECODED SHIT

/**
 * Full backend lifecycle against a running instance
 *
 * Drives the backend over HTTP + socket.io the way the panel does, from a fresh
 * install through running real game servers:
 *   1. log in as the seeded admin
 *   2. accept the EULA and finish onboarding
 *   3. install the BeamMP blueprint from a .kbp bundle
 *   4. discover the available server types
 *   5. per type x version x java-build: create, start, query, stop, delete
 *
 * See helpers.ts for how to start the backend and run this suite. The version
 * MATRIX below is hand-written: per server type, list exactly which builds to
 * create and, per entry, the Java (auto or pinned) and heap.
 *
 * Useful env knobs (all optional): BASE_URL, E2E_USERNAME, E2E_PASSWORD,
 * E2E_BLUEPRINT_SRC, E2E_XMX, E2E_XMS, E2E_ONLY_TYPES, E2E_PORT_BASE,
 * E2E_KEEP_SERVERS, and the *_TIMEOUT_MS knobs.
 */

import { afterAll, describe, expect, test } from "bun:test";
import compressing from "compressing";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { io, Socket } from "socket.io-client";
import {
  api,
  BASE,
  bool,
  completeOnboarding,
  log,
  login,
  num,
  sleep,
  unwrap,
  waitTask,
} from "./helpers";

const USERNAME = process.env.E2E_USERNAME ?? "kubek";
const PASSWORD = process.env.E2E_PASSWORD ?? "Kubek2026";

// Directory containing the BeamMP blueprint.json
const BLUEPRINT_SRC =
  process.env.E2E_BLUEPRINT_SRC ??
  "/Users/seeeroy/Documents/GitHub/Kubek/blueprint-template";

// Heap defaults applied to Java-based builds that do not override them
const DEFAULT_XMX = num(process.env.E2E_XMX, 4096);
const DEFAULT_XMS = num(process.env.E2E_XMS, 512);

interface Build {
  version: string;
  // omit on non-Java types (bedrock / beammp); defaults to "auto" on Java types
  java?: "auto" | number;
  xmx?: number;
  xms?: number;
}

const auto = (...versions: string[]): Build[] =>
  versions.map((version) => ({ version, java: "auto" }));
const plain = (...versions: string[]): Build[] =>
  versions.map((version) => ({ version }));

// One entry per server to create, keyed by blueprint id. Use "*" to apply one
// array to every discovered type; a type with no entry (and no "*") is skipped.
const MATRIX: Record<string, Build[]> = {
  "com.kubek.bedrock": plain("1.21.114.1"),
  "com.kubek.fabric": auto("26.1.2", "1.21.1", "1.16.5", "1.14.4"),
  "com.kubek.folia": auto("26.1.2", "1.21.4", "1.19.4"),
  "com.kubek.paper": auto(
    "26.1.2",
    "1.21.1",
    "1.18.1",
    "1.16.5",
    "1.15.2",
    "1.13",
    "1.12.2",
    "1.8.8",
  ),
  "com.kubek.purpur": auto("26.1.2", "1.12.1", "1.18.2", "1.16.5", "1.14.4"),
  "com.kubek.spigot": auto("1.21", "1.18", "1.12.2", "1.8", "1.6.4"),
  "com.kubek.vanilla": auto("1.21.1", "1.7.10", "1.5.2"),
  "com.kubek.velocity": [{ version: "3.5.0-SNAPSHOT", java: 25 }],
  "com.kubek.waterfall": auto("1.21", "1.12"),
  "com.kubek.beammp": plain("v3.9.3"),
};

// Keep test-created servers by default; set E2E_KEEP_SERVERS=false to clean up
const KEEP_SERVERS = bool(process.env.E2E_KEEP_SERVERS, true);

// Restrict to specific blueprint ids (comma separated)
const ONLY_TYPES = (process.env.E2E_ONLY_TYPES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// First TCP port handed to created servers; each new server takes the next one
let nextPort = num(process.env.E2E_PORT_BASE, 25600);

const CREATE_TIMEOUT_MS = num(process.env.E2E_CREATE_TIMEOUT_MS, 15 * 60_000);
const START_TIMEOUT_MS = num(process.env.E2E_START_TIMEOUT_MS, 3 * 60_000);
const QUERY_TIMEOUT_MS = num(process.env.E2E_QUERY_TIMEOUT_MS, 60_000);
const STOP_TIMEOUT_MS = num(process.env.E2E_STOP_TIMEOUT_MS, 60_000);
const MATRIX_TIMEOUT_MS = num(
  process.env.E2E_MATRIX_TIMEOUT_MS,
  6 * 60 * 60_000,
);

// Bundled types whose query is unreliable to assert: observed, never fatal
const PROXY_IDS = ["com.kubek.velocity", "com.kubek.waterfall"];
const BEDROCK_IDS = ["com.kubek.bedrock"];
const CUSTOM_ID = "com.kubek.custom";
const BEAMMP_ID = "com.kubek.beammp";

interface ServerType {
  id: string;
  name: string;
  game: string;
  platforms?: string[];
  variables: { key: string }[];
  ports: { key: string; primary?: boolean; default?: number }[];
  features: string[];
}

const ctx: {
  token: string;
  userId: string;
  socket?: Socket;
  types: ServerType[];
} = {
  token: "",
  userId: "",
  types: [],
};

const createdServerIds = new Set<string>();
const failures: string[] = [];

// Per-build result row for the final summary table
type Outcome = "ok" | "warn" | "fail";
interface ResultRow {
  type: string;
  version: string;
  java: string;
  installMs?: number;
  startMs?: number;
  outcome: Outcome;
  stage?: string;
  note?: string;
}
const results: ResultRow[] = [];

const fmtMs = (v?: number): string =>
  v == null ? "-" : `${(v / 1000).toFixed(1)}s`;
const outcomeIcon = (o: Outcome): string =>
  o === "ok" ? "[ok]" : o === "warn" ? "[warn]" : "[fail]";

function printResultsTable(rows: ResultRow[]): void {
  const head = [
    "TYPE",
    "VERSION",
    "JAVA",
    "INSTALL",
    "START",
    "RESULT",
    "STAGE / NOTE",
  ];
  const body = rows.map((r) => [
    r.type,
    r.version,
    r.java,
    fmtMs(r.installMs),
    fmtMs(r.startMs),
    outcomeIcon(r.outcome),
    r.outcome === "ok"
      ? ""
      : `${r.stage ?? ""}${r.note ? " " + r.note : ""}`.slice(0, 70),
  ]);
  // Pad every column except the free-form trailing note
  const widths = head.map((h, i) =>
    i === head.length - 1
      ? 0
      : Math.max(h.length, ...body.map((r) => r[i].length)),
  );
  const render = (cols: string[]): string =>
    cols
      .map((c, i) => (i === cols.length - 1 ? c : c.padEnd(widths[i])))
      .join("  ");
  log.raw("\n" + render(head));
  log.raw(widths.map((w) => "-".repeat(w || 12)).join("  "));
  for (const r of body) log.raw(render(r));
}

async function waitServerStatus(
  id: string,
  target: string,
  label: string,
  timeout: number,
): Promise<any> {
  const deadline = Date.now() + timeout;
  let last = "";
  while (Date.now() < deadline) {
    const s = unwrap(
      await api("GET", `/api/servers/${id}`, { token: ctx.token }),
    );
    if (s.status !== last) {
      log.info(`${label}: status=${s.status}`);
      last = s.status;
    }
    if (s.status === target) return s;
    if (target === "running" && s.status === "stopped" && last !== "") {
      throw new Error(
        `${label}: returned to "stopped" before "running" (crash on start?)`,
      );
    }
    await sleep(2000);
  }
  throw new Error(
    `${label}: did not reach "${target}" within ${Math.round(timeout / 1000)}s (last="${last}")`,
  );
}

// Subscribe to a server room and resolve on the panel's own query result
function waitForQuery(
  socket: Socket,
  serverId: string,
  timeout: number,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const onData = (p: any): void => {
      if (
        p &&
        p.serverId === serverId &&
        !p.error &&
        (p.version || p.players)
      ) {
        cleanup();
        resolve(p);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`no query data within ${Math.round(timeout / 1000)}s`));
    }, timeout);
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off("server:query_data", onData);
    };
    socket.on("server:query_data", onData);
  });
}

function subscribeRoom(socket: Socket, room: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = (): void => {
      cleanup();
      resolve();
    };
    const onNo = (): void => {
      cleanup();
      reject(new Error(`room rejected: ${room}`));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`room subscribe timeout: ${room}`));
    }, 10_000);
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off("room:success", onOk);
      socket.off("room:rejected", onNo);
    };
    socket.on("room:success", onOk);
    socket.on("room:rejected", onNo);
    socket.emit("room:subscribe", room);
  });
}

// Zip the blueprint source into a .kbp, staging only the files the installer needs
async function buildBlueprintBundle(srcDir: string): Promise<Buffer> {
  if (!fs.existsSync(path.join(srcDir, "blueprint.json"))) {
    throw new Error(`No blueprint.json found at ${srcDir}`);
  }
  const manifest = JSON.parse(
    fs.readFileSync(path.join(srcDir, "blueprint.json"), "utf-8"),
  );
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-e2e-bp-"));
  const stage = path.join(work, String(manifest.id || "blueprint"));
  fs.mkdirSync(stage, { recursive: true });
  for (const f of [
    "blueprint.json",
    "versions.ts",
    "icon.png",
    "package.json",
    "README.md",
  ]) {
    const from = path.join(srcDir, f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(stage, f));
  }
  const zipPath = path.join(work, "bundle.kbp");
  await compressing.zip.compressDir(stage, zipPath);
  const buf = fs.readFileSync(zipPath);
  fs.rmSync(work, { recursive: true, force: true });
  return buf;
}

const currentPlatform = process.platform;

function isSupportedHere(t: ServerType): boolean {
  return !t.platforms?.length || t.platforms.includes(currentPlatform);
}
function hasJava(t: ServerType): boolean {
  return t.variables.some((v) => v.key === "JAVA_VERSION");
}
function primaryPortKey(t: ServerType): string | undefined {
  const p = t.ports?.find((x) => x.primary) ?? t.ports?.[0];
  return p?.key;
}
// "required": must observe a query; "best-effort": try, warn only; "none": skip
function queryMode(t: ServerType): "required" | "best-effort" | "none" {
  if (t.game === "beamng") return "none";
  if (PROXY_IDS.includes(t.id) || BEDROCK_IDS.includes(t.id))
    return "best-effort";
  if (t.game === "minecraft") return "required";
  return "best-effort";
}

describe("Kubek backend full fresh-install lifecycle", () => {
  afterAll(async () => {
    if (KEEP_SERVERS) {
      if (createdServerIds.size) {
        log.info(
          `E2E_KEEP_SERVERS=on, keeping ${createdServerIds.size} created server(s)`,
        );
      }
    } else {
      for (const id of createdServerIds) {
        try {
          const s = unwrap(
            await api("GET", `/api/servers/${id}`, { token: ctx.token }),
          );
          await api("DELETE", `/api/servers/${id}`, {
            token: ctx.token,
            json: { password: PASSWORD, confirmName: s.name },
          });
          log.info(`cleanup: deleted leftover server ${id}`);
        } catch {
          // already gone
        }
      }
    }
    ctx.socket?.disconnect();
  });

  test("0. backend is reachable", async () => {
    log.step(`Pinging backend at ${BASE}`);
    // /api/auth/login is public; an empty body 4xx still proves the server answers
    let reachable = false;
    try {
      await api("POST", "/api/auth/login", { json: {} });
      reachable = true;
    } catch (e: any) {
      reachable = !String(e?.message).includes("network error");
    }
    expect(reachable).toBe(true);
    log.ok(`backend responds on ${BASE} (platform: ${currentPlatform})`);
  });

  test("1. log in as the fresh-install admin", async () => {
    log.step(`Logging in as "${USERNAME}"`);
    const session = await login(USERNAME, PASSWORD);
    ctx.token = session.token;
    ctx.userId = session.userId;
    expect(ctx.token).toBeTruthy();
    log.ok(`logged in (admin=${session.isAdmin})`);
  });

  test("2. accept EULA and finish onboarding", async () => {
    log.step("Accepting EULA and completing onboarding");
    await completeOnboarding(ctx.token);
    const cfg = unwrap(
      await api("GET", "/api/kubek/config", { token: ctx.token }),
    );
    expect(cfg.eulaAccepted).toBe(true);
    const profile = unwrap(
      await api("GET", "/api/auth/profile", { token: ctx.token }),
    );
    expect(profile.oobeCompleted).toBe(true);
    log.ok(`EULA accepted, onboarding complete (port=${cfg.port})`);
  });

  test("3. connect socket.io for the live query stream", async () => {
    log.step("Opening socket.io connection");
    const socket = io(BASE, {
      transports: ["websocket"],
      auth: { authorization: `Bearer ${ctx.token}` },
      reconnection: false,
      timeout: 10_000,
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("socket connect timeout")),
        12_000,
      );
      socket.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on("connect_error", (e) => {
        clearTimeout(timer);
        reject(new Error(`socket connect_error: ${e.message}`));
      });
      socket.on("auth:failed", (m) => {
        clearTimeout(timer);
        reject(new Error(`socket auth failed: ${m}`));
      });
    });
    ctx.socket = socket;
    log.ok(`socket connected (id=${socket.id})`);
  });

  test("4. install the BeamMP blueprint", async () => {
    log.step(`Installing blueprint from ${BLUEPRINT_SRC}`);
    if (!fs.existsSync(BLUEPRINT_SRC)) {
      throw new Error(
        `Blueprint source not found at ${BLUEPRINT_SRC}. Set E2E_BLUEPRINT_SRC to the dir with blueprint.json.`,
      );
    }
    const bundle = await buildBlueprintBundle(BLUEPRINT_SRC);
    log.info(`bundled ${bundle.length} bytes`);

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bundle)]), "beammp.kbp");
    const res = unwrap(
      await api("POST", "/api/server-types", { token: ctx.token, form }),
    );
    expect(res.valid).toBe(true);
    expect(res.id).toBe(BEAMMP_ID);
    log.ok(`installed blueprint "${res.name}" (${res.id})`);

    const types: ServerType[] = unwrap(
      await api("GET", "/api/server-types", { token: ctx.token }),
    );
    expect(types.some((t) => t.id === BEAMMP_ID)).toBe(true);
    log.ok("BeamMP present in /api/server-types");
  });

  test("5. discover available server types", async () => {
    log.step("Listing server types");
    const all: ServerType[] = unwrap(
      await api("GET", "/api/server-types", { token: ctx.token }),
    );
    log.info(`catalogue: ${all.map((t) => t.id).join(", ")}`);

    let usable = all.filter((t) => t.id !== CUSTOM_ID);
    usable = usable.filter((t) => MATRIX[t.id] || MATRIX["*"]);
    if (ONLY_TYPES.length)
      usable = usable.filter((t) => ONLY_TYPES.includes(t.id));

    for (const t of usable) {
      if (!isSupportedHere(t)) {
        log.warn(
          `skipping ${t.id}, not supported on ${currentPlatform} (platforms=${t.platforms})`,
        );
      }
    }
    ctx.types = usable.filter(isSupportedHere);
    log.info(
      `testing ${ctx.types.length} type(s): ${ctx.types
        .map((t) => `${t.id}[query:${queryMode(t)}]`)
        .join(", ")}`,
    );
    expect(ctx.types.length).toBeGreaterThan(0);
    log.ok("server types resolved");
  });

  test(
    "6. full matrix: create / start / query / stop each build",
    async () => {
      const socket = ctx.socket!;

      for (const type of ctx.types) {
        const builds = MATRIX[type.id] ?? MATRIX["*"];
        if (!builds?.length) {
          log.warn(`no matrix entry for ${type.id}, skipping`);
          continue;
        }
        log.step(`Type: ${type.name} (${type.id}), ${builds.length} build(s)`);

        let offered: string[] = [];
        try {
          offered = unwrap(
            await api(
              "GET",
              `/api/server-types/${encodeURIComponent(type.id)}/versions`,
              {
                token: ctx.token,
              },
            ),
          );
        } catch (e: any) {
          log.warn(`could not list versions for ${type.id}: ${e.message}`);
        }

        const portKey = primaryPortKey(type);
        const java = hasJava(type);

        for (const build of builds) {
          if (offered.length && !offered.includes(build.version)) {
            log.warn(
              `${type.id}: version "${build.version}" not offered, trying anyway`,
            );
          }
          const javaSpec = java ? (build.java ?? "auto") : undefined;
          const label = `${type.id}@${build.version}${javaSpec != null ? ` java=${javaSpec}` : ""}`;
          await runCombo(socket, type, build, javaSpec, portKey, label);
        }
      }

      const okCount = results.filter((r) => r.outcome === "ok").length;
      const warnCount = results.filter((r) => r.outcome === "warn").length;
      const failCount = results.filter((r) => r.outcome === "fail").length;
      log.raw(
        `\nmatrix done: ${results.length} server(s), ok ${okCount}, warn ${warnCount}, fail ${failCount}`,
      );
      printResultsTable(results);

      // The suite never aborts mid-matrix; it only reports red if something failed
      expect(failures).toEqual([]);
    },
    MATRIX_TIMEOUT_MS,
  );
});

// One full combo: create, start, query, stop (and delete unless KEEP_SERVERS).
// Never throws; it records a ResultRow and the run continues to the next combo.
async function runCombo(
  socket: Socket,
  type: ServerType,
  build: Build,
  javaSpec: "auto" | number | undefined,
  portKey: string | undefined,
  label: string,
): Promise<void> {
  const version = build.version;
  const short = type.id.split(".").pop()!;
  const row: ResultRow = {
    type: short,
    version,
    java: javaSpec == null ? "-" : String(javaSpec),
    outcome: "ok",
  };
  results.push(row);

  const name = `e2e-${short}-${version}-${Date.now().toString(36)}`;
  const port = nextPort++;
  let serverId: string | undefined;
  let stage = "create";

  try {
    const variables: Record<string, string | number> = {
      GAME_VERSION: version,
    };
    if (portKey) variables[portKey] = port;

    if (javaSpec != null) {
      stage = "java";
      let javaMajor: number;
      if (javaSpec === "auto") {
        const rec = unwrap(
          await api("GET", `/api/java/${encodeURIComponent(version)}`, {
            token: ctx.token,
          }),
        );
        javaMajor = typeof rec === "number" && rec > 0 ? rec : 21;
        log.info(
          `${label}: auto Java ${javaMajor}${typeof rec === "number" ? "" : " (fallback)"}`,
        );
      } else {
        javaMajor = javaSpec;
        log.info(`${label}: explicit Java ${javaMajor}`);
      }
      row.java = String(javaMajor);
      variables.JAVA_VERSION = javaMajor;
      variables.XMX = build.xmx ?? DEFAULT_XMX;
      variables.XMS = build.xms ?? DEFAULT_XMS;
    }

    stage = "create";
    log.step(`CREATE ${label} as "${name}" on port ${port}`);
    log.info(`variables: ${JSON.stringify(variables)}`);
    const form = new FormData();
    form.append(
      "payload",
      JSON.stringify({ name, blueprintId: type.id, variables }),
    );
    const tCreate = Date.now();
    const created = unwrap(
      await api("POST", "/api/servers", { token: ctx.token, form }),
    );
    serverId = created.server.id;
    createdServerIds.add(serverId!);
    await waitTask(
      ctx.token,
      created.taskId,
      `${label} create`,
      CREATE_TIMEOUT_MS,
    );
    row.installMs = Date.now() - tCreate;
    log.ok(`${label}: created in ${fmtMs(row.installMs)} (id=${serverId})`);

    stage = "start";
    log.step(`START ${label}`);
    const qmode = queryMode(type);
    // Start listening for the query before the server is up so we do not miss it
    await subscribeRoom(socket, `server:${serverId}`);
    const queryPromise =
      qmode === "none"
        ? null
        : waitForQuery(socket, serverId!, QUERY_TIMEOUT_MS);

    const tStart = Date.now();
    await api("POST", `/api/servers/${serverId}/start`, {
      token: ctx.token,
      json: {},
    });
    await waitServerStatus(
      serverId!,
      "running",
      `${label} start`,
      START_TIMEOUT_MS,
    );
    row.startMs = Date.now() - tStart;
    log.ok(`${label}: running (started in ${fmtMs(row.startMs)})`);

    if (queryPromise) {
      stage = "query";
      log.step(`QUERY ${label}`);
      try {
        const q = await queryPromise;
        log.ok(
          `${label}: query ok, version="${q.version ?? "?"}", players=${q.players?.online ?? "?"}/${q.players?.max ?? "?"}`,
        );
      } catch (e: any) {
        if (qmode === "required")
          throw new Error(`query never arrived (${e.message})`);
        log.warn(`${label}: query best-effort missed, ${e.message}`);
        if (row.outcome === "ok") {
          row.outcome = "warn";
          row.stage = "query";
          row.note = "query best-effort missed";
        }
      }
    } else {
      log.info(`${label}: query protocol is "none", skipping query check`);
    }

    stage = "stop";
    log.step(`STOP ${label}`);
    await api("POST", `/api/servers/${serverId}/stop`, {
      token: ctx.token,
      json: {},
    });
    await waitServerStatus(
      serverId!,
      "stopped",
      `${label} stop`,
      STOP_TIMEOUT_MS,
    );
    log.ok(`${label}: stopped`);
  } catch (e: any) {
    log.bad(`${label} [${stage}]: ${e.message}`);
    row.outcome = "fail";
    row.stage = stage;
    row.note = e.message;
    failures.push(`${label} [${stage}]: ${e.message}`);
  } finally {
    if (serverId && !KEEP_SERVERS) {
      try {
        await api("POST", `/api/servers/${serverId}/kill`, {
          token: ctx.token,
          json: {},
        }).catch(() => {});
        await api("DELETE", `/api/servers/${serverId}`, {
          token: ctx.token,
          json: { password: PASSWORD, confirmName: name },
        });
        createdServerIds.delete(serverId);
        log.info(`${label}: deleted`);
      } catch (e: any) {
        log.warn(`${label}: cleanup failed, ${e.message}`);
      }
    } else if (serverId) {
      log.info(`${label}: kept (E2E_KEEP_SERVERS=on)`);
    }
  }
}
