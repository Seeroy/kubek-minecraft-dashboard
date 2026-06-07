// TOTALLY VIBECODED SHIT

/**
 * Shared infrastructure for the e2e suites.
 *
 * These tests talk to an ALREADY-RUNNING backend over HTTP (they do not boot
 * Nest themselves, because the app depends on the bun runtime / bun:sqlite).
 * Start the backend on a fresh DB first, then point a suite at it:
 *
 *   cd backend
 *   rm -f db.sql                      # fresh DB, admin kubek / Kubek2026 re-seeded
 *   NODE_ENV=development bun run start:dev
 *   BASE_URL=http://localhost:8000 npm run test:e2e
 */

export const BASE = (process.env.BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export function num(v: string | undefined, fallback: number): number {
  const n = v != null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function bool(v: string | undefined, fallback: boolean): boolean {
  if (v == null) return fallback;
  return !/^(0|false|no|off)$/i.test(v.trim());
}

/** Error carrying the HTTP status so callers can assert on it */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: unknown,
  ) {
    const detail =
      body && typeof body === "object" ? JSON.stringify(body) : String(body);
    super(`${endpoint} → ${status}: ${detail}`);
    this.name = "ApiError";
  }
}

interface ApiOptions {
  token?: string;
  json?: unknown;
  form?: FormData;
}

/**
 * Thin HTTP client. The backend wraps responses as { success, data }; raw
 * parsed JSON is returned here and unwrap() peels off the envelope.
 * Non-2xx responses throw an ApiError so callers can inspect the status.
 */
export async function api(
  method: string,
  endpoint: string,
  opts: ApiOptions = {},
): Promise<any> {
  const headers: Record<string, string> = {};
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  let body: string | FormData | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${endpoint}`, { method, headers, body });
  } catch (e: any) {
    throw new Error(
      `${method} ${endpoint} network error: ${e?.message}. Is the backend running at ${BASE}?`,
    );
  }

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) throw new ApiError(res.status, `${method} ${endpoint}`, parsed);
  return parsed;
}

export const unwrap = (j: any): any =>
  j && typeof j === "object" && "data" in j ? j.data : j;

/** Run a request and return its HTTP status without throwing on 4xx/5xx */
export async function statusOf(
  method: string,
  endpoint: string,
  opts: ApiOptions = {},
): Promise<number> {
  try {
    await api(method, endpoint, opts);
    return 200;
  } catch (e) {
    if (e instanceof ApiError) return e.status;
    throw e;
  }
}

// Logging: write straight to stdout so Jest's CustomConsole does not wrap every
// line with a console.log header and a source trace.
let STEP = 0;
const clock = (): string => new Date().toISOString().slice(11, 19);
const out = (m: string): void => void process.stdout.write(`${m}\n`);

export const log = {
  step: (m: string): void => out(`\n[${clock()}] > STEP ${++STEP}: ${m}`),
  info: (m: string): void => out(`[${clock()}]    - ${m}`),
  ok: (m: string): void => out(`[${clock()}]    + ${m}`),
  warn: (m: string): void => out(`[${clock()}]    ! ${m}`),
  bad: (m: string): void => out(`[${clock()}]    x ${m}`),
  raw: out,
};

export interface Session {
  token: string;
  userId: string;
  username: string;
  isAdmin: boolean;
}

/** Log in and return a session, failing loudly on a 2FA-gated account */
export async function login(
  username: string,
  password: string,
): Promise<Session> {
  const res = unwrap(
    await api("POST", "/api/auth/login", { json: { username, password } }),
  );
  if (res?.require2fa) {
    throw new Error(
      `Account "${username}" has 2FA enabled; use a fresh DB without 2FA.`,
    );
  }
  if (!res?.token) throw new Error(`Login for "${username}" returned no token`);
  return {
    token: res.token,
    userId: res.user.id,
    username: res.user.username,
    isAdmin: !!res.user.isAdmin,
  };
}

/** Accept the EULA and finish onboarding for the given session */
export async function completeOnboarding(token: string): Promise<void> {
  await api("GET", "/api/kubek/acceptEULA", { token });
  await api("POST", "/api/auth/complete-oobe", { token });
}

/** Poll a background task until it succeeds, fails, or times out */
export async function waitTask(
  token: string,
  taskId: string,
  label: string,
  timeout: number,
): Promise<any> {
  const deadline = Date.now() + timeout;
  let lastSig = "";
  while (Date.now() < deadline) {
    const t = unwrap(await api("GET", `/api/tasks/${taskId}`, { token }));
    const sig = `${t.status}|${t.step ?? ""}|${t.progress ?? 0}`;
    if (sig !== lastSig) {
      log.info(`${label}: ${t.status} ${t.step ?? ""} ${t.progress ?? 0}%`);
      lastSig = sig;
    }
    if (t.status === "success") return t;
    if (t.status === "failed") {
      throw new Error(
        `${label} task failed: ${t.error?.code ?? "?"} ${t.error?.message ?? "?"}`,
      );
    }
    await sleep(1500);
  }
  throw new Error(
    `${label} task timed out after ${Math.round(timeout / 1000)}s`,
  );
}
