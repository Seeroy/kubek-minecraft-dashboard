import type {
  ExtProcess,
  ExtProcessesApi,
  ExtSpawnOptions,
} from "@kubekpanel/extension-sdk";
import { AuditAction, AuditResult } from "@shared/types/audit.types";
import { basename, isAbsolute, relative, resolve } from "node:path";
import type { ExtAudit } from "./ext-audit";

const DEFAULT_GRACE_MS = 5_000;

/** Keeps cwd inside the extension data dir */
export function resolveCwd(dataDir: string, cwd?: string): string {
  const target = resolve(dataDir, cwd ?? ".");
  const rel = relative(dataDir, target);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`cwd must stay inside the extension data dir: ${cwd}`);
  }
  return target;
}

async function pipeLines(
  stream: ReadableStream<Uint8Array> | null | undefined,
  emit: (line: string) => void,
): Promise<void> {
  if (!stream) return;
  const decoder = new TextDecoder();
  let rest = "";
  for await (const chunk of stream) {
    rest += decoder.decode(chunk, { stream: true });
    const lines = rest.split(/\r?\n|\r/);
    rest = lines.pop() ?? "";
    for (const line of lines) if (line) emit(line);
  }
  if (rest) emit(rest);
}

/** Every child goes to dispose, so disabling the extension kills it */
export function createProcessesApi(
  dataDir: string,
  dispose: Array<() => void>,
  audit: ExtAudit = () => {},
): ExtProcessesApi {
  return {
    spawn(options: ExtSpawnOptions): ExtProcess {
      // Arguments often carry tokens, the journal gets the program and the folder only
      const details = {
        command: basename(options.command),
        cwd: relative(dataDir, resolve(dataDir, options.cwd ?? ".")) || ".",
      };
      let child: ReturnType<typeof Bun.spawn>;
      try {
        child = Bun.spawn([options.command, ...(options.args ?? [])], {
          cwd: resolveCwd(dataDir, options.cwd),
          env: { ...process.env, ...options.env },
          stdin: options.stdin ? "pipe" : "ignore",
          stdout: "pipe",
          stderr: "pipe",
        });
      } catch (error) {
        audit({
          action: AuditAction.EXTENSION_PROCESS,
          details,
          result: AuditResult.FAILED,
          error: String(error),
        });
        throw error;
      }
      audit({ action: AuditAction.EXTENSION_PROCESS, details: { ...details, pid: child.pid } });

      const listeners = new Set<
        (line: string, stream: "stdout" | "stderr") => void
      >();
      const emit = (stream: "stdout" | "stderr") => (line: string) =>
        listeners.forEach((cb) => {
          try {
            cb(line, stream);
          } catch {
            // A throwing listener must not stop the reader
          }
        });
      void pipeLines(child.stdout as ReadableStream<Uint8Array>, emit("stdout")).catch(() => {});
      void pipeLines(child.stderr as ReadableStream<Uint8Array>, emit("stderr")).catch(() => {});

      const exited = child.exited.then((code) =>
        child.signalCode ? null : code,
      );

      const kill = async (graceMs = DEFAULT_GRACE_MS): Promise<void> => {
        if (child.exitCode !== null || child.signalCode) return;
        child.kill("SIGTERM");
        const timer = setTimeout(() => child.kill("SIGKILL"), graceMs);
        await exited;
        clearTimeout(timer);
      };
      dispose.push(() => void kill());

      return {
        pid: child.pid,
        onLine(cb) {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
        exited,
        write(data) {
          if (!options.stdin) throw new Error("spawned without stdin: true");
          const stdin = child.stdin as import("bun").FileSink;
          stdin.write(data);
          stdin.flush();
        },
        kill,
      };
    },
  };
}
