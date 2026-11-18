import { killPromise } from "@/core/utils/promiseKill";
import { withUtf8Locale } from "./locale-env";

/** sh -c on POSIX, cmd /c on Windows */
export function shellArgv(
  command: string,
  platform: NodeJS.Platform = process.platform,
): string[] {
  return platform === "win32"
    ? ["cmd.exe", "/d", "/s", "/c", `"${command}"`]
    : ["/bin/sh", "-c", command];
}

export interface RunProcessOptions {
  argv: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  /** Kill when it runs longer than this */
  timeoutMs?: number;
  /** Kill when it prints nothing for this long */
  idleTimeoutMs?: number;
  /** Pass the cmd.exe command line as is, for shellArgv on Windows */
  windowsVerbatimArguments?: boolean;
  onLine?: (line: string) => void;
}

export interface RunProcessResult {
  code: number | null;
  /** Last lines of stdout and stderr together */
  tail: string[];
  timedOut?: "total" | "idle";
}

const TAIL_LINES = 30;

/** Runs to the end, output goes to onLine line by line */
export async function runProcess(
  opts: RunProcessOptions,
): Promise<RunProcessResult> {
  // Own process group on Unix, so one signal takes sh and everything it started
  const ownGroup = process.platform !== "win32";
  const proc = Bun.spawn(opts.argv, {
    detached: ownGroup,
    cwd: opts.cwd,
    env: withUtf8Locale({ ...process.env, ...opts.env }),
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    windowsVerbatimArguments: opts.windowsVerbatimArguments,
  });

  const tail: string[] = [];
  let timedOut: RunProcessResult["timedOut"];
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const stop = (reason: "total" | "idle") => {
    timedOut ??= reason;
    if (ownGroup) {
      try {
        process.kill(-proc.pid, "SIGKILL");
      } catch {
        proc.kill("SIGKILL");
      }
      return;
    }
    // cmd leaves its children running, taskkill /T takes the tree
    void killPromise(proc.pid, "SIGKILL").catch(() => proc.kill("SIGKILL"));
  };
  const touch = () => {
    if (!opts.idleTimeoutMs) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => stop("idle"), opts.idleTimeoutMs);
  };
  const totalTimer = opts.timeoutMs
    ? setTimeout(() => stop("total"), opts.timeoutMs)
    : undefined;
  touch();

  const pump = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffered = "";
    const emit = (line: string) => {
      // Progress bars redraw with \r, keep what was drawn last
      const text = line.split("\r").filter(Boolean).pop()?.trimEnd() ?? "";
      if (!text) return;
      tail.push(text);
      if (tail.length > TAIL_LINES) tail.shift();
      opts.onLine?.(text);
    };
    for await (const chunk of stream) {
      touch();
      buffered += decoder.decode(chunk, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      lines.forEach(emit);
    }
    buffered += decoder.decode();
    if (buffered) emit(buffered);
  };

  try {
    await Promise.all([pump(proc.stdout), pump(proc.stderr)]);
    const code = await proc.exited;
    return { code, tail, timedOut };
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    if (totalTimer) clearTimeout(totalTimer);
  }
}
