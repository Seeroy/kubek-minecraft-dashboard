import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProcessesApi, resolveCwd } from "./processes.api";

const dataDir = mkdtempSync(join(tmpdir(), "ext-proc-"));

describe("resolveCwd", () => {
  test("stays inside the data dir", () => {
    expect(resolveCwd(dataDir)).toBe(dataDir);
    expect(resolveCwd(dataDir, "bin")).toBe(join(dataDir, "bin"));
    expect(() => resolveCwd(dataDir, "../escape")).toThrow();
    expect(() => resolveCwd(dataDir, "/etc")).toThrow();
  });
});

describe("createProcessesApi", () => {
  test("splits output into lines by stream", async () => {
    const api = createProcessesApi(dataDir, []);
    const proc = api.spawn({
      command: "sh",
      args: ["-c", "printf 'a\\nb\\n'; printf 'err\\n' >&2"],
    });
    const lines: string[] = [];
    proc.onLine((line, stream) => lines.push(`${stream}:${line}`));
    expect(await proc.exited).toBe(0);
    await Bun.sleep(20);
    expect(lines.sort()).toEqual(["stderr:err", "stdout:a", "stdout:b"]);
  });

  test("dispose kills what is still running", async () => {
    const dispose: Array<() => void> = [];
    const proc = createProcessesApi(dataDir, dispose).spawn({
      command: "sleep",
      args: ["30"],
    });
    expect(dispose).toHaveLength(1);
    dispose.forEach((fn) => fn());
    expect(await proc.exited).toBeNull();
  });

  test("kill escalates to SIGKILL when SIGTERM is ignored", async () => {
    const proc = createProcessesApi(dataDir, []).spawn({
      command: "sh",
      args: ["-c", "trap '' TERM; sleep 30"],
    });
    await Bun.sleep(50);
    const started = Date.now();
    await proc.kill(100);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(await proc.exited).toBeNull();
  });
});
