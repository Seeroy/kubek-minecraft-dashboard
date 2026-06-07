// CREDITS:
// npm: tree-kill
// npm: tree-kill-promise

import { getErrorCode } from "@/core/utils/error";
import { exec, spawn } from "child_process";

/**
 * Cross-platform killer for a process and its entire child process tree
 *
 * @param pid - Process ID to kill
 * @param signal - Optional signal (default: SIGTERM)
 *
 * @example
 * await killPromise(1234);
 * await killPromise(1234, "SIGKILL");
 */
export async function killPromise(
  pid: number,
  signal: NodeJS.Signals = "SIGTERM",
): Promise<void> {
  if (!Number.isInteger(pid)) {
    throw new Error("PID must be a number");
  }

  switch (process.platform) {
    case "win32":
      await killWindows(pid);
      break;

    case "darwin":
      await killUnix(pid, signal, (ppid) =>
        spawn("pgrep", ["-P", String(ppid)]),
      );
      break;

    default: // Linux / BSD
      await killUnix(pid, signal, (ppid) =>
        spawn("ps", ["-o", "pid", "--no-headers", "--ppid", String(ppid)]),
      );
  }
}

///
/// Windows branch
///

function killWindows(pid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`taskkill /pid ${pid} /T /F`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

///
/// Unix branch
///

async function killUnix(
  pid: number,
  signal: NodeJS.Signals,
  spawnChildren: (pid: number) => ReturnType<typeof spawn>,
): Promise<void> {
  const tree: Record<number, number[]> = { [pid]: [] };
  const pending: Record<number, boolean> = { [pid]: true };

  await buildTree(pid, tree, pending, spawnChildren);
  killTree(tree, signal);
}

function killTree(tree: Record<number, number[]>, signal: NodeJS.Signals) {
  const killed: Record<number, boolean> = {};

  for (const parent in tree) {
    for (const child of tree[parent]) {
      if (!killed[child]) {
        safeKill(child, signal);
        killed[child] = true;
      }
    }

    const p = Number(parent);
    if (!killed[p]) {
      safeKill(p, signal);
      killed[p] = true;
    }
  }
}

function safeKill(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(pid, signal);
  } catch (err: unknown) {
    if (getErrorCode(err) !== "ESRCH") {
      throw err;
    }
  }
}

///
/// Recursive process tree
///

function buildTree(
  parentPid: number,
  tree: Record<number, number[]>,
  pending: Record<number, boolean>,
  spawnChildren: (pid: number) => ReturnType<typeof spawn>,
): Promise<void> {
  return new Promise((resolve) => {
    const ps = spawnChildren(parentPid);
    let out = "";

    ps.stdout?.on("data", (d) => {
      out += d.toString("ascii");
    });

    ps.on("close", (code) => {
      delete pending[parentPid];

      // No child processes
      if (code !== 0) {
        if (Object.keys(pending).length === 0) resolve();
        return;
      }

      const matches = out.match(/\d+/g) || [];

      for (const m of matches) {
        const pid = Number(m);
        tree[parentPid].push(pid);
        tree[pid] = [];
        pending[pid] = true;

        buildTree(pid, tree, pending, spawnChildren).then(() => {
          if (Object.keys(pending).length === 0) resolve();
        });
      }

      if (matches.length === 0 && Object.keys(pending).length === 0) {
        resolve();
      }
    });
  });
}
