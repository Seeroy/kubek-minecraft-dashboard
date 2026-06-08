// TOTALLY VIBECODED SHIT

/**
 * RBAC enforcement against a running backend.
 *
 * Logs in as the seeded admin, makes sure two servers exist, then creates a set
 * of non-admin accounts with different permissions and server restrictions and
 * checks that the two guards behave:
 *   - PermissionsGuard: a missing permission yields 403, a granted one passes
 *   - ServerAccessGuard: a restricted user reaches only its allowed servers
 *
 * Authorization is verified at the guard layer, so most checks read the HTTP
 * status without performing the underlying action (e.g. a granted "create"
 * passes the guard and then fails validation with 400, never spawning a server;
 * a granted "control" on a non-existent id reaches the controller and 404s).
 *
 * On top of the role-based scenarios there is a full per-permission matrix: one
 * unrestricted account per UserPermissions entry probes a representative gated
 * endpoint, proving each permission unlocks its own endpoint and denies the rest.
 *
 * See helpers.ts for how to start the backend and run this suite. Useful env
 * knobs: BASE_URL, E2E_USERNAME, E2E_PASSWORD, E2E_KEEP_SERVERS, E2E_KEEP_ACCOUNTS.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  bool,
  completeOnboarding,
  log,
  login,
  num,
  Session,
  statusOf,
  unwrap,
  waitTask,
} from "./helpers";

const ADMIN_USER = process.env.E2E_USERNAME ?? "kubek";
const ADMIN_PASS = process.env.E2E_PASSWORD ?? "Kubek2026";

// Shared password for every account this suite creates
const ACCOUNT_PASS = "Rbac2026!";

// Created servers are kept by default so re-runs reuse them; set false to clean up
const KEEP_SERVERS = bool(process.env.E2E_KEEP_SERVERS, true);
const KEEP_ACCOUNTS = bool(process.env.E2E_KEEP_ACCOUNTS, true);

const CREATE_TIMEOUT_MS = num(process.env.E2E_CREATE_TIMEOUT_MS, 15 * 60_000);

// Permission strings, mirroring the backend UserPermissions enum
const P = {
  ACCOUNTS: "accounts_mgr",
  FILE_MANAGER: "file_manager",
  VIEW: "servers_view",
  CONTROL: "servers_control",
  CONFIGURE: "servers_configure",
  CREATE: "servers_create",
  JAVA: "java_mgr",
  PLUGINS: "plugins_mgr",
  SETTINGS: "kubek_settings",
  BACKUPS: "backups",
  MONITORING: "system_monitoring",
  SCHEDULER: "scheduler_mgr",
  AUDIT: "audit_log",
} as const;

// Every permission the panel knows about
const ALL_PERMS: string[] = Object.values(P);

interface AccountSpec {
  username: string;
  permissions: string[];
  // Allowed server ids; empty means unrestricted access
  servers: string[];
}

// Accounts under test. serverA/serverB are filled in once they are resolved.
const accounts: Record<string, AccountSpec> = {
  // VIEW only, restricted to serverA
  viewer: { username: "rbac_viewer", permissions: [P.VIEW], servers: [] },
  // VIEW + CONTROL, unrestricted
  operator: {
    username: "rbac_operator",
    permissions: [P.VIEW, P.CONTROL],
    servers: [],
  },
  // VIEW + CREATE, unrestricted
  creator: {
    username: "rbac_creator",
    permissions: [P.VIEW, P.CREATE],
    servers: [],
  },
  // Account management only
  accountant: {
    username: "rbac_accountant",
    permissions: [P.ACCOUNTS],
    servers: [],
  },
  // No permissions at all
  nobody: { username: "rbac_nobody", permissions: [], servers: [] },
};

const sessions: Record<string, Session> = {};
const createdServerIds = new Set<string>();
const createdAccountUsernames = new Set<string>();

let admin: Session;
let serverA: string;
let serverB: string;
// A bogus id that no server will ever have, for guard-only control checks
const GHOST_SERVER = "00000000-0000-0000-0000-000000000000";

// Reuse an existing server or create a fresh vanilla one and wait for install
async function ensureServer(index: number): Promise<string> {
  const existing: any[] = unwrap(
    await api("GET", "/api/servers", { token: admin.token }),
  );
  if (existing[index]) {
    log.info(`reusing existing server ${existing[index].id}`);
    return existing[index].id;
  }

  const types: any[] = unwrap(
    await api("GET", "/api/server-types", { token: admin.token }),
  );
  const vanilla = types.find((t) => t.id === "com.kubek.vanilla");
  if (!vanilla) throw new Error("com.kubek.vanilla blueprint is not available");

  const version = "1.5.2";
  const portKey = (
    vanilla.ports?.find((p: any) => p.primary) ?? vanilla.ports?.[0]
  )?.key;
  const javaRec = unwrap(
    await api("GET", `/api/java/${encodeURIComponent(version)}`, {
      token: admin.token,
    }),
  );
  const javaMajor = typeof javaRec === "number" && javaRec > 0 ? javaRec : 8;

  const variables: Record<string, string | number> = {
    GAME_VERSION: version,
    JAVA_VERSION: javaMajor,
    XMX: 1024,
    XMS: 512,
  };
  if (portKey) variables[portKey] = 25700 + index;

  const name = `rbac-server-${index}-${Date.now().toString(36)}`;
  const form = new FormData();
  form.append(
    "payload",
    JSON.stringify({ name, blueprintId: vanilla.id, variables }),
  );
  log.info(`creating server "${name}" (vanilla ${version}, java ${javaMajor})`);
  const created = unwrap(
    await api("POST", "/api/servers", { token: admin.token, form }),
  );
  const id = created.server.id;
  createdServerIds.add(id);
  await waitTask(
    admin.token,
    created.taskId,
    `create ${name}`,
    CREATE_TIMEOUT_MS,
  );
  return id;
}

async function deleteAccountIfExists(username: string): Promise<void> {
  try {
    await api("DELETE", `/api/accounts/${username}`, { token: admin.token });
  } catch {
    // not present
  }
}

async function createAccount(spec: AccountSpec): Promise<void> {
  await deleteAccountIfExists(spec.username);
  await api("POST", "/api/accounts", {
    token: admin.token,
    json: {
      username: spec.username,
      password: ACCOUNT_PASS,
      permissions: spec.permissions,
      servers: spec.servers,
    },
  });
  createdAccountUsernames.add(spec.username);
}

// Empty-but-valid multipart create payload: passes the guard, then fails
// validation with 400, so granted accounts never actually spawn a server
function emptyCreateForm(): FormData {
  const form = new FormData();
  form.append("payload", "{}");
  return form;
}

// One representative endpoint per permission. Each is side-effect free: an
// account holding the permission passes the guards and then either succeeds or
// fails harmlessly later (validation 400, missing-resource 404), while an
// account lacking it is stopped at PermissionsGuard with 403. The path is built
// lazily so resolved server ids are available, and body() supplies a request
// payload where the route needs one.
interface Probe {
  // Permission the endpoint is gated behind
  perm: string;
  // Short human label for log output
  label: string;
  method: string;
  path: () => string;
  body?: () => { json?: unknown; form?: FormData };
}

function gatedProbes(): Probe[] {
  return [
    {
      perm: P.ACCOUNTS,
      label: "list accounts",
      method: "GET",
      path: () => "/api/accounts",
    },
    {
      perm: P.VIEW,
      label: "list servers",
      method: "GET",
      path: () => "/api/servers",
    },
    {
      perm: P.CONTROL,
      label: "start server",
      method: "POST",
      path: () => `/api/servers/${GHOST_SERVER}/start`,
      body: () => ({ json: {} }),
    },
    {
      perm: P.CONFIGURE,
      label: "read server.properties",
      method: "GET",
      path: () => `/api/servers/${serverA}/properties`,
    },
    {
      perm: P.CREATE,
      label: "create server",
      method: "POST",
      path: () => "/api/servers",
      body: () => ({ form: emptyCreateForm() }),
    },
    {
      perm: P.FILE_MANAGER,
      label: "scan files",
      method: "GET",
      path: () => `/api/files/scan?serverId=${serverA}`,
    },
    {
      perm: P.JAVA,
      label: "list java versions",
      method: "GET",
      path: () => "/api/java",
    },
    {
      perm: P.PLUGINS,
      label: "list installed plugins",
      method: "GET",
      path: () => `/api/plugins/installed/${serverA}`,
    },
    {
      perm: P.SETTINGS,
      label: "read panel config",
      method: "GET",
      path: () => "/api/kubek/config",
    },
    {
      perm: P.BACKUPS,
      label: "list backups",
      method: "GET",
      path: () => "/api/backups",
    },
    {
      perm: P.MONITORING,
      label: "system info",
      method: "GET",
      path: () => "/api/system-monitoring/info",
    },
    {
      perm: P.SCHEDULER,
      label: "list scheduled tasks",
      method: "GET",
      path: () => `/api/servers/${serverA}/scheduled-tasks`,
    },
    {
      perm: P.AUDIT,
      label: "query audit log",
      method: "GET",
      path: () => "/api/audit-logs",
    },
  ];
}

// Single-permission accounts, one per entry in P, all unrestricted. They let
// each permission be tested in isolation so the matrix can prove a permission
// unlocks only its own endpoints
const soloSessions: Record<string, Session> = {};

describe("Kubek backend RBAC enforcement", () => {
  beforeAll(async () => {
    log.step("Setting up admin, servers and test accounts");
    admin = await login(ADMIN_USER, ADMIN_PASS);
    await completeOnboarding(admin.token);
    log.ok(`admin logged in (isAdmin=${admin.isAdmin})`);

    serverA = await ensureServer(0);
    serverB = await ensureServer(1);
    if (serverA === serverB)
      throw new Error("need two distinct servers for access-scoping tests");
    log.ok(`servers ready: A=${serverA}, B=${serverB}`);

    // The viewer is restricted to serverA only
    accounts.viewer.servers = [serverA];

    for (const key of Object.keys(accounts)) {
      await createAccount(accounts[key]);
      sessions[key] = await login(accounts[key].username, ACCOUNT_PASS);
      log.info(`account "${accounts[key].username}" created and logged in`);
    }

    // One unrestricted account per permission, for the isolation matrix
    for (const perm of ALL_PERMS) {
      const spec: AccountSpec = {
        username: `rbac_solo_${perm}`,
        permissions: [perm],
        servers: [],
      };
      await createAccount(spec);
      soloSessions[perm] = await login(spec.username, ACCOUNT_PASS);
    }
    log.ok("all test accounts ready");
  }, CREATE_TIMEOUT_MS + 60_000);

  afterAll(async () => {
    if (!KEEP_ACCOUNTS) {
      for (const username of createdAccountUsernames) {
        await deleteAccountIfExists(username);
      }
    }
    if (!KEEP_SERVERS) {
      for (const id of createdServerIds) {
        try {
          const s = unwrap(
            await api("GET", `/api/servers/${id}`, { token: admin.token }),
          );
          await api("POST", `/api/servers/${id}/kill`, {
            token: admin.token,
            json: {},
          }).catch(() => {});
          await api("DELETE", `/api/servers/${id}`, {
            token: admin.token,
            json: { password: ADMIN_PASS, confirmName: s.name },
          });
        } catch {
          // already gone
        }
      }
    } else if (createdServerIds.size) {
      log.info(
        `E2E_KEEP_SERVERS=on, keeping ${createdServerIds.size} created server(s)`,
      );
    }
  });

  test("admin reaches every server and the account list", async () => {
    log.step("Admin baseline");
    const t = admin.token;
    expect(await statusOf("GET", "/api/servers", { token: t })).toBe(200);
    expect(await statusOf("GET", `/api/servers/${serverA}`, { token: t })).toBe(
      200,
    );
    expect(await statusOf("GET", `/api/servers/${serverB}`, { token: t })).toBe(
      200,
    );
    expect(await statusOf("GET", "/api/accounts", { token: t })).toBe(200);
    log.ok("admin unrestricted as expected");
  });

  test("viewer: sees only its allowed server and cannot control or manage", async () => {
    log.step("Viewer (VIEW only, restricted to serverA)");
    const t = sessions.viewer.token;

    // Has VIEW, so the list endpoint is allowed
    expect(await statusOf("GET", "/api/servers", { token: t })).toBe(200);
    // Allowed server is reachable
    expect(await statusOf("GET", `/api/servers/${serverA}`, { token: t })).toBe(
      200,
    );
    // ServerAccessGuard blocks the disallowed server
    expect(await statusOf("GET", `/api/servers/${serverB}`, { token: t })).toBe(
      403,
    );
    // No CONTROL permission
    expect(
      await statusOf("POST", `/api/servers/${serverA}/start`, {
        token: t,
        json: {},
      }),
    ).toBe(403);
    // No CREATE permission
    expect(
      await statusOf("POST", "/api/servers", {
        token: t,
        form: emptyCreateForm(),
      }),
    ).toBe(403);
    // No ACCOUNTS_MANAGEMENT permission
    expect(await statusOf("GET", "/api/accounts", { token: t })).toBe(403);
    log.ok("viewer scoping enforced");
  });

  test("operator: controls any server but cannot create or manage accounts", async () => {
    log.step("Operator (VIEW + CONTROL, unrestricted)");
    const t = sessions.operator.token;

    // Unrestricted, so both servers are visible
    expect(await statusOf("GET", `/api/servers/${serverA}`, { token: t })).toBe(
      200,
    );
    expect(await statusOf("GET", `/api/servers/${serverB}`, { token: t })).toBe(
      200,
    );
    // CONTROL granted: the guard passes and the controller 404s on a ghost id
    expect(
      await statusOf("POST", `/api/servers/${GHOST_SERVER}/start`, {
        token: t,
        json: {},
      }),
    ).toBe(404);
    // No CREATE permission
    expect(
      await statusOf("POST", "/api/servers", {
        token: t,
        form: emptyCreateForm(),
      }),
    ).toBe(403);
    // No ACCOUNTS_MANAGEMENT permission
    expect(await statusOf("GET", "/api/accounts", { token: t })).toBe(403);
    log.ok("operator permissions enforced");
  });

  test("creator: may create servers but cannot control them or manage accounts", async () => {
    log.step("Creator (VIEW + CREATE, unrestricted)");
    const t = sessions.creator.token;

    // CREATE granted: the guard passes and the controller rejects the empty payload
    expect(
      await statusOf("POST", "/api/servers", {
        token: t,
        form: emptyCreateForm(),
      }),
    ).toBe(400);
    // No CONTROL permission
    expect(
      await statusOf("POST", `/api/servers/${serverA}/start`, {
        token: t,
        json: {},
      }),
    ).toBe(403);
    // No ACCOUNTS_MANAGEMENT permission
    expect(await statusOf("GET", "/api/accounts", { token: t })).toBe(403);
    log.ok("creator permissions enforced");
  });

  test("accountant: manages accounts but cannot escalate or touch servers", async () => {
    log.step("Accountant (ACCOUNTS_MANAGEMENT only)");
    const t = sessions.accountant.token;

    // Can list accounts
    expect(await statusOf("GET", "/api/accounts", { token: t })).toBe(200);
    // No SERVERS_VIEW permission
    expect(await statusOf("GET", "/api/servers", { token: t })).toBe(403);
    expect(await statusOf("GET", `/api/servers/${serverA}`, { token: t })).toBe(
      403,
    );
    // No CREATE permission
    expect(
      await statusOf("POST", "/api/servers", {
        token: t,
        form: emptyCreateForm(),
      }),
    ).toBe(403);

    // A non-admin manager cannot grant admin rights: the update is accepted but
    // the isAdmin flag is ignored
    await api("PUT", `/api/accounts/${accounts.viewer.username}`, {
      token: t,
      json: { isAdmin: true },
    });
    const viewerAfter = unwrap(
      await api("GET", `/api/accounts/${accounts.viewer.username}`, {
        token: admin.token,
      }),
    );
    expect(viewerAfter.isAdmin).toBeFalsy();
    log.ok("accountant scoping and escalation guard enforced");
  });

  test("nobody: no permissions, denied everywhere", async () => {
    log.step("Nobody (no permissions)");
    const t = sessions.nobody.token;

    expect(await statusOf("GET", "/api/servers", { token: t })).toBe(403);
    expect(await statusOf("GET", `/api/servers/${serverA}`, { token: t })).toBe(
      403,
    );
    expect(
      await statusOf("POST", "/api/servers", {
        token: t,
        form: emptyCreateForm(),
      }),
    ).toBe(403);
    expect(await statusOf("GET", "/api/accounts", { token: t })).toBe(403);
    log.ok("permissionless account fully denied");
  });

  test("every gated endpoint accepts the matching permission", async () => {
    log.step("Permission grants: each permission unlocks its own endpoint");
    for (const probe of gatedProbes()) {
      const session = soloSessions[probe.perm];
      const status = await statusOf(probe.method, probe.path(), {
        token: session.token,
        ...(probe.body?.() ?? {}),
      });
      // Guard passed when the response is neither 401 (auth) nor 403 (permission)
      if (status === 401 || status === 403) {
        log.bad(`${probe.label} (${probe.perm}) blocked with ${status}`);
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    }
    log.ok(`${gatedProbes().length} permissions each unlock their endpoint`);
  });

  test("a permission unlocks only its own endpoints", async () => {
    log.step("Permission isolation: holding one permission denies the rest");
    const probes = gatedProbes();
    for (const holder of probes) {
      const session = soloSessions[holder.perm];
      let denied = 0;
      for (const probe of probes) {
        if (probe.perm === holder.perm) continue;
        const status = await statusOf(probe.method, probe.path(), {
          token: session.token,
          ...(probe.body?.() ?? {}),
        });
        if (status !== 403) {
          log.bad(
            `${holder.perm} unexpectedly reached ${probe.label} (${status})`,
          );
        }
        expect(status).toBe(403);
        denied++;
      }
      log.info(`${holder.perm}: denied ${denied} unrelated endpoints`);
    }
    log.ok("each permission is scoped to its own endpoints");
  });
});
