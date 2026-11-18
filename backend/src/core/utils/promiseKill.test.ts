import { describe, expect, test } from "bun:test";
import { spawn } from "child_process";
import { killPromise } from "./promiseKill";

describe.skipIf(process.platform === "win32")("killPromise", () => {
  test("still kills the process when ps is missing", async () => {
    const child = spawn("/bin/sleep", ["10"]);
    const exited = new Promise((resolve) => child.on("exit", resolve));
    const path = process.env.PATH;
    process.env.PATH = "/nonexistent";
    try {
      await killPromise(child.pid!, "SIGKILL");
    } finally {
      process.env.PATH = path;
    }
    expect(await exited).toBe(null);
  });
});
