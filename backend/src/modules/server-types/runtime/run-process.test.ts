import { describe, expect, test } from "bun:test";
import os from "os";
import { runProcess, shellArgv } from "./run-process";

describe("shellArgv", () => {
  test("sh on POSIX, quoted cmd on Windows", () => {
    expect(shellArgv("echo hi", "linux")).toEqual(["/bin/sh", "-c", "echo hi"]);
    expect(shellArgv('"C:\\java" -jar x', "win32")).toEqual([
      "cmd.exe",
      "/d",
      "/s",
      "/c",
      '""C:\\java" -jar x"',
    ]);
  });
});

describe.skipIf(process.platform === "win32")("runProcess", () => {
  const sh = (command: string) => ["/bin/sh", "-c", command];

  test("feeds lines from stdout and stderr and returns the code", async () => {
    const lines: string[] = [];
    const result = await runProcess({
      argv: sh("echo one; echo two >&2; printf 'no newline'; exit 4"),
      cwd: os.tmpdir(),
      onLine: (line) => lines.push(line),
    });
    expect(result.code).toBe(4);
    expect(lines.sort()).toEqual(["no newline", "one", "two"]);
  });

  test("keeps what a progress bar drew last", async () => {
    const result = await runProcess({
      argv: sh("printf '10%%\\r50%%\\r100%%\\n'"),
      cwd: os.tmpdir(),
    });
    expect(result.tail).toEqual(["100%"]);
  });

  test("stops a process that goes quiet", async () => {
    const started = Date.now();
    const result = await runProcess({
      argv: sh("echo start; sleep 10"),
      cwd: os.tmpdir(),
      idleTimeoutMs: 200,
    });
    expect(result.timedOut).toBe("idle");
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
