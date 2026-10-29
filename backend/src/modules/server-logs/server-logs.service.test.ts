import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FileManagerService } from "@/modules/files/file-manager.service";
import { fake } from "@/testing/fake";
import { BadRequestException } from "@nestjs/common";
import fs from "fs";
import os from "os";
import path from "path";
import { ServerLogsService } from "./server-logs.service";

let cwd: string;
let root: string;
let serverDir: string;
let logs: ServerLogsService;

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-logs-"));
  process.chdir(root);
  serverDir = path.join(root, "servers", "s1");
  fs.mkdirSync(path.join(serverDir, "logs"), { recursive: true });
  fs.writeFileSync(path.join(root, "db.sql"), "secret");
  logs = new ServerLogsService(new FileManagerService(fake()));
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("ServerLogsService", () => {
  test("reads a log file", async () => {
    fs.writeFileSync(path.join(serverDir, "logs/latest.log"), "a\nb\nc");

    expect(await logs.readContent("s1", "latest.log", { tail: 2 })).toBe(
      "b\nc",
    );
  });

  test("a log linked outside the server is refused", async () => {
    fs.symlinkSync(
      path.join(root, "db.sql"),
      path.join(serverDir, "logs/latest.log"),
    );

    await expect(logs.readContent("s1", "latest.log")).rejects.toThrow(
      BadRequestException,
    );
    await expect(logs.search("s1", "latest.log", "secret")).rejects.toThrow(
      BadRequestException,
    );
  });

  test("a logs folder linked outside the server is refused", async () => {
    fs.rmSync(path.join(serverDir, "logs"), { recursive: true });
    fs.symlinkSync(root, path.join(serverDir, "logs"));

    await expect(logs.readContent("s1", "db.sql")).rejects.toThrow(
      BadRequestException,
    );
    expect(await logs.listFiles("s1")).toEqual([]);
  });
});
