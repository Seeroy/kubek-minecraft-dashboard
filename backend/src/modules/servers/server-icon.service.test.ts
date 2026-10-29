import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import fs from "fs";
import { Jimp } from "jimp";
import os from "os";
import path from "path";
import { ServerIconService } from "./server-icon.service";

let cwd: string;
let root: string;
let icons: ServerIconService;
let server: IServer;

const iconFile = () => path.join(root, "servers", server.id, "server-icon.png");
const upload = (buffer: Buffer) =>
  fake<Express.Multer.File>({ originalname: "icon.jpg", buffer });

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-icon-"));
  process.chdir(root);
  const repo = new ServersRepository(sqliteProvider());
  icons = new ServerIconService(repo);
  server = repo.create({
    name: "alpha",
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: true, attempts: 3 },
    blueprintId: "test.core",
    variables: {},
  });
  fs.mkdirSync(path.join(root, "servers", server.id), { recursive: true });
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("ServerIconService", () => {
  test("an uploaded image becomes a 64x64 png", async () => {
    const image = new Jimp({ width: 200, height: 100, color: 0xff0000ff });

    await icons.upload(server.id, upload(await image.getBuffer("image/jpeg")));

    expect(icons.iconPath(server.id)).toBe(fs.realpathSync(iconFile()));
    const saved = await Jimp.read(fs.readFileSync(iconFile()));
    expect([saved.width, saved.height]).toEqual([64, 64]);
    expect(fs.readFileSync(iconFile()).subarray(1, 4).toString()).toBe("PNG");
  });

  test("a server without an icon has no icon path", () => {
    expect(icons.iconPath(server.id)).toBeNull();
  });

  test("an id that leaves the servers folder is refused", () => {
    expect(() => icons.iconPath("../etc")).toThrow("Invalid server id");
  });

  test("an icon linked to a file outside the server is not served", () => {
    const secret = path.join(root, "db.sql");
    fs.writeFileSync(secret, "secret");
    fs.symlinkSync(secret, iconFile());

    expect(() => icons.iconPath(server.id)).toThrow(BadRequestException);
  });

  test("an icon linked inside the server is served by its real path", () => {
    const real = path.join(root, "servers", server.id, "logo.png");
    fs.writeFileSync(real, "png");
    fs.symlinkSync(real, iconFile());

    expect(icons.iconPath(server.id)).toBe(fs.realpathSync(real));
  });

  test("an upload does not write through a link out of the server", async () => {
    const secret = path.join(root, "db.sql");
    fs.writeFileSync(secret, "secret");
    fs.symlinkSync(secret, iconFile());
    const image = new Jimp({ width: 8, height: 8, color: 0xff0000ff });

    await expect(
      icons.upload(server.id, upload(await image.getBuffer("image/png"))),
    ).rejects.toThrow(BadRequestException);
    expect(fs.readFileSync(secret, "utf8")).toBe("secret");
  });

  test("bytes that are not an image are refused", async () => {
    await expect(
      icons.upload(server.id, upload(Buffer.from("hello"))),
    ).rejects.toThrow(BadRequestException);
    expect(fs.existsSync(iconFile())).toBe(false);
  });

  test("an icon for an unknown server is refused", async () => {
    await expect(
      icons.upload("missing", upload(Buffer.from("x"))),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
