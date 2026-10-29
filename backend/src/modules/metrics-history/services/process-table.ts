import {
  type ChildProcessWithoutNullStreams,
  execFile,
  spawn,
} from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface ProcessEntry {
  ppid: number;
  /** Cumulative user + system CPU time */
  cpuMs: number;
  /** Resident memory, on Linux filled later by fillRss */
  rssBytes: number;
}

export type ProcessTable = Map<number, ProcessEntry>;

// Linux USER_HZ, the same 100 on every mainstream kernel
const CLK_TCK = 100;

/** Snapshot of every process with its parent, CPU time and memory */
export async function readProcessTable(): Promise<ProcessTable> {
  if (process.platform === "linux") return readLinux();
  if (process.platform === "win32") return readWindows();
  return readPs();
}

/** Resident memory for the given pids, only Linux needs this second pass */
export async function fillRss(table: ProcessTable, pids: number[]): Promise<void> {
  if (process.platform !== "linux") return;
  await Promise.all(
    pids.map(async (pid) => {
      const entry = table.get(pid);
      if (!entry) return;
      try {
        const status = await fs.readFile(`/proc/${pid}/status`, "utf8");
        const kb = /^VmRSS:\s+(\d+)/m.exec(status)?.[1];
        entry.rssBytes = kb ? Number(kb) * 1024 : 0;
      } catch {
        // exited between the two reads
      }
    }),
  );
}

async function readLinux(): Promise<ProcessTable> {
  const table: ProcessTable = new Map();
  const pids = (await fs.readdir("/proc")).filter((name) => /^\d+$/.test(name));
  await Promise.all(
    pids.map(async (name) => {
      try {
        const stat = await fs.readFile(`/proc/${name}/stat`, "utf8");
        // comm may contain spaces and parens, fields start after the last ')'
        const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        const ticks = Number(fields[11]) + Number(fields[12]);
        table.set(Number(name), {
          ppid: Number(fields[1]),
          cpuMs: (ticks / CLK_TCK) * 1000,
          rssBytes: 0,
        });
      } catch {
        // exited while listing
      }
    }),
  );
  return table;
}

const END_MARKER = "__KUBEK_END__";
// The shell is kept warm between polls and closed once nobody asks for a while
const POWERSHELL_IDLE_MS = 30_000;
const POWERSHELL_TIMEOUT_MS = 15_000;

// One CIM query for the whole table per input line, so a sample costs no PowerShell startup
const WIN_LOOP = `
$ErrorActionPreference = 'SilentlyContinue'
while ($null -ne [Console]::In.ReadLine()) {
  foreach ($p in Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,KernelModeTime,UserModeTime,WorkingSetSize) {
    [Console]::Out.WriteLine("$($p.ProcessId) $($p.ParentProcessId) $($p.KernelModeTime + $p.UserModeTime) $($p.WorkingSetSize)")
  }
  [Console]::Out.WriteLine('${END_MARKER}')
  [Console]::Out.Flush()
}
`;

/** Long-lived PowerShell answering one process table per request */
class PowerShellSampler {
  private proc?: ChildProcessWithoutNullStreams;
  private output = "";
  private pending?: {
    resolve: (text: string) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  private idleTimer?: ReturnType<typeof setTimeout>;

  query(): Promise<string> {
    if (this.pending) return Promise.reject(new Error("sample in progress"));
    const proc = this.ensureStarted();
    clearTimeout(this.idleTimer);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail(new Error("PowerShell did not answer in time"));
      }, POWERSHELL_TIMEOUT_MS);
      this.pending = { resolve, reject, timer };
      proc.stdin.write("\n");
    });
  }

  private ensureStarted(): ChildProcessWithoutNullStreams {
    if (this.proc) return this.proc;
    const encoded = Buffer.from(WIN_LOOP, "utf16le").toString("base64");
    const proc = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
      { windowsHide: true },
    );
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk: string) => this.onData(chunk));
    // Events of a shell that was already replaced must not touch the new one
    proc.on("error", (error) => {
      if (this.proc === proc) this.fail(error);
    });
    proc.on("exit", () => {
      if (this.proc === proc) this.fail(new Error("PowerShell exited"));
    });
    // Never keep the panel alive just for the sampler
    proc.unref();
    this.proc = proc;
    this.output = "";
    return proc;
  }

  private onData(chunk: string): void {
    this.output += chunk;
    const end = this.output.indexOf(END_MARKER);
    if (end < 0 || !this.pending) return;
    const text = this.output.slice(0, end);
    this.output = this.output.slice(end + END_MARKER.length);
    const { resolve, timer } = this.pending;
    clearTimeout(timer);
    this.pending = undefined;
    this.idleTimer = setTimeout(() => this.stop(), POWERSHELL_IDLE_MS);
    resolve(text);
  }

  private fail(error: Error): void {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = undefined;
    }
    // A broken or stuck shell is replaced on the next request
    this.stop();
  }

  private stop(): void {
    clearTimeout(this.idleTimer);
    const proc = this.proc;
    this.proc = undefined;
    this.output = "";
    proc?.kill();
  }
}

const powershell = new PowerShellSampler();

async function readWindows(): Promise<ProcessTable> {
  const stdout = await powershell.query();
  const table: ProcessTable = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const [pid, ppid, time, rss] = line.trim().split(" ").map(Number);
    if (!pid) continue;
    // CIM times are in 100ns units
    table.set(pid, { ppid, cpuMs: time / 10_000, rssBytes: rss || 0 });
  }
  return table;
}

async function readPs(): Promise<ProcessTable> {
  const { stdout } = await run("ps", ["-axo", "pid=,ppid=,rss=,time="], {
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const table: ProcessTable = new Map();
  for (const line of stdout.split("\n")) {
    const [pid, ppid, rss, time] = line.trim().split(/\s+/);
    if (!pid || !time) continue;
    table.set(Number(pid), {
      ppid: Number(ppid),
      cpuMs: parseCpuTime(time),
      rssBytes: Number(rss) * 1024,
    });
  }
  return table;
}

/** ps cputime, [dd-][hh:]mm:ss[.ss] */
function parseCpuTime(value: string): number {
  const [days, rest] = value.includes("-") ? value.split("-") : ["0", value];
  const seconds = rest
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
  return (Number(days) * 86_400 + seconds) * 1000;
}

/** The root pid and every process below it */
export function processTree(table: ProcessTable, root: number): number[] {
  const children = new Map<number, number[]>();
  for (const [pid, entry] of table) {
    const list = children.get(entry.ppid);
    if (list) list.push(pid);
    else children.set(entry.ppid, [pid]);
  }
  const tree: number[] = [];
  const queue = table.has(root) ? [root] : [];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    tree.push(pid);
    for (const child of children.get(pid) ?? []) {
      // Guards against a reused pid looping back into its own tree
      if (!tree.includes(child)) queue.push(child);
    }
  }
  return tree;
}
