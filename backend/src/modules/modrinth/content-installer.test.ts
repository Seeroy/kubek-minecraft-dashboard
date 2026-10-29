import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { IServerPluginsRepository } from "@/modules/database/repositories/server-plugins.repository";
import type { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { BadRequestException } from "@nestjs/common";
import type {
  ModrinthProject,
  ModrinthVersion,
  ServerPluginRecord,
} from "@shared/types/plugins";
import fs from "fs";
import os from "os";
import path from "path";
import { ContentInstaller } from "./content-installer";

let cwd: string;
let root: string;
let outside: string;
let installer: ContentInstaller;

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-content-"));
  process.chdir(root);
  outside = path.join(root, "data");
  fs.mkdirSync(outside);
  fs.mkdirSync(path.join(root, "servers", "s1"), { recursive: true });
  // the server swapped its plugins folder for a link
  fs.symlinkSync(outside, path.join(root, "servers", "s1", "plugins"));
  installer = new ContentInstaller(
    "plugins",
    fake<IServerPluginsRepository>({
      listDependants: () => [],
      delete: () => true,
      findByServerAndProject: () => null,
    }),
    fake<TasksService>({ updateTask: () => null }),
  );
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("ContentInstaller with a linked content folder", () => {
  test("removing a record leaves the file behind the link alone", async () => {
    fs.writeFileSync(path.join(outside, "db.sql"), "secret");

    await installer.removeRecordWithFile(
      fake<ServerPluginRecord>({
        id: "r1",
        serverId: "s1",
        fileName: "db.sql",
      }),
      false,
    );

    expect(fs.existsSync(path.join(outside, "db.sql"))).toBe(true);
  });

  test("an install is refused before downloading", async () => {
    await expect(
      installer.installSingle({
        taskId: "t",
        serverId: "s1",
        context: {
          project: fake<ModrinthProject>({ id: "p", title: "P" }),
          version: fake<ModrinthVersion>({
            id: "v",
            files: [
              {
                url: "https://cdn.modrinth.com/x.jar",
                filename: "x.jar",
                primary: true,
                hashes: {},
              },
            ] as ModrinthVersion["files"],
          }),
        },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(fs.readdirSync(outside)).toEqual([]);
  });
});
