import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { userWith } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import * as fs from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FtpFs } from "./ftp-fs";
import { resolveFtpPort, resolvePasvHost } from "./ftp.service";

const user = (over: Partial<IUser> = {}): IUser =>
  userWith(
    { [AccessArea.FILES]: "manage" },
    { id: "u1", serversRestrict: { enabled: true, allowed: ["s1"] }, ...over },
  );

const filesAt = (level: "read" | "write") =>
  userWith(
    { [AccessArea.FILES]: level },
    { id: "u1", serversRestrict: { enabled: true, allowed: ["s1"] } },
  );

type Cb<T> = (err: NodeJS.ErrnoException | null, value?: T) => void;

const call = <T>(fn: (cb: Cb<T>) => void) =>
  new Promise<T>((resolve, reject) =>
    fn((err, value) => (err ? reject(err) : resolve(value as T))),
  );

// Error code, "ok" if it worked
const codeOf = (fn: (cb: Cb<unknown>) => void) =>
  call(fn).then(
    () => "ok",
    (err: NodeJS.ErrnoException) => err.code ?? "error",
  );

const failed = (stream: NodeJS.EventEmitter) =>
  new Promise<void>((resolve) => stream.on("error", () => resolve()));

let tmp: string;
let prevCwd: string;
let current: IUser | null;
const ftp = new FtpFs({
  getUser: () => current,
  listServerIds: () => ["s1", "s2"],
});

beforeAll(() => {
  prevCwd = process.cwd();
  tmp = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), "kubek-ftp-")));
  fs.mkdirSync(join(tmp, "servers/s1/sub"), { recursive: true });
  fs.mkdirSync(join(tmp, "servers/s2"), { recursive: true });
  fs.mkdirSync(join(tmp, "outside"));
  fs.writeFileSync(join(tmp, "outside/secret.txt"), "secret");
  fs.writeFileSync(join(tmp, "servers/s1/a.txt"), "hello");
  fs.writeFileSync(join(tmp, "servers/s2/b.txt"), "other");
  fs.symlinkSync(join(tmp, "outside"), join(tmp, "servers/s1/escape"));
  fs.symlinkSync(join(tmp, "servers/s1/sub"), join(tmp, "servers/s1/inner"));
  fs.symlinkSync(join(tmp, "nowhere"), join(tmp, "servers/s1/dangling"));
  process.chdir(tmp);
});

afterAll(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("FtpFs", () => {
  test("root lists only allowed servers", async () => {
    current = user();
    expect(await call<string[]>((cb) => ftp.readdir("/", cb))).toEqual(["s1"]);
    current = user({ serversRestrict: { enabled: false, allowed: [] } });
    expect(await call<string[]>((cb) => ftp.readdir("/", cb))).toEqual([
      "s1",
      "s2",
    ]);
  });

  test("foreign server looks missing", async () => {
    current = user();
    expect(await codeOf((cb) => ftp.stat("/s2/b.txt", cb))).toBe("ENOENT");
    expect(await codeOf((cb) => ftp.readdir("/s2", cb))).toBe("ENOENT");
    expect(await codeOf((cb) => ftp.unlink("/s2/b.txt", cb))).toBe("ENOENT");
    expect(fs.existsSync(join(tmp, "servers/s2/b.txt"))).toBe(true);
  });

  test("without files access nothing is reachable", async () => {
    current = userWith(
      { [AccessArea.CONSOLE]: "write", [AccessArea.POWER]: "manage" },
      { id: "u1" },
    );
    expect(await codeOf((cb) => ftp.readdir("/", cb))).toBe("EACCES");
    expect(await codeOf((cb) => ftp.stat("/s1/a.txt", cb))).toBe("EACCES");
    current = null;
    expect(await codeOf((cb) => ftp.stat("/", cb))).toBe("EACCES");
  });

  test("dot segments can't leave the tree", () => {
    current = user();
    expect(() => ftp.resolve("/s1/../s2/b.txt")).toThrow();
    expect(() => ftp.resolve("/s1/sub/../../../outside/secret.txt")).toThrow();
    expect(() => ftp.resolve("\\s1\\..\\s2")).toThrow();
  });

  test("symlinks pointing outside are refused and hidden", async () => {
    current = user();
    expect(
      await codeOf((cb) => ftp.open("/s1/escape/secret.txt", "r", cb)),
    ).toBe("EACCES");
    expect(await codeOf((cb) => ftp.readdir("/s1/escape", cb))).toBe("EACCES");
    const names = await call<string[]>((cb) => ftp.readdir("/s1", cb));
    expect(names.sort()).toEqual(["a.txt", "inner", "sub"]);
  });

  test("writes through outside links fail", async () => {
    current = user();
    await failed(ftp.createWriteStream("/s1/escape/new.txt", { flags: "w" }));
    expect(fs.existsSync(join(tmp, "outside/new.txt"))).toBe(false);
    await failed(ftp.createWriteStream("/s1/dangling", { flags: "w" }));
    expect(fs.existsSync(join(tmp, "nowhere"))).toBe(false);
  });

  test("symlinks inside the server work", async () => {
    current = user();
    const stats = await call<fs.Stats>((cb) => ftp.stat("/s1/inner", cb));
    expect(stats.isDirectory()).toBe(true);
  });

  test("normal file operations work", async () => {
    current = user();
    const fd = await call<number>((cb) => ftp.open("/s1/a.txt", "r", cb));
    fs.closeSync(fd);
    await call((cb) => ftp.mkdir("/s1/made", 0o755, cb));
    expect(fs.statSync(join(tmp, "servers/s1/made")).isDirectory()).toBe(true);
    const stream = ftp.createWriteStream("/s1/made/up.txt", { flags: "w" });
    await new Promise<void>((resolve, reject) => {
      stream.on("error", reject);
      stream.end("data", () => resolve());
    });
    await call((cb) => ftp.rename("/s1/made/up.txt", "/s1/up.txt", cb));
    expect(fs.readFileSync(join(tmp, "servers/s1/up.txt"), "utf8")).toBe(
      "data",
    );
    await call((cb) => ftp.unlink("/s1/up.txt", cb));
    await call((cb) => ftp.rmdir("/s1/made", cb));
    expect(fs.existsSync(join(tmp, "servers/s1/made"))).toBe(false);
  });

  test("files read lists and opens but can't change anything", async () => {
    current = filesAt("read");
    expect(await call<string[]>((cb) => ftp.readdir("/", cb))).toEqual(["s1"]);
    const fd = await call<number>((cb) => ftp.open("/s1/a.txt", "r", cb));
    fs.closeSync(fd);
    expect(await codeOf((cb) => ftp.mkdir("/s1/ro", 0o755, cb))).toBe("EACCES");
    expect(await codeOf((cb) => ftp.rename("/s1/a.txt", "/s1/c.txt", cb))).toBe(
      "EACCES",
    );
    expect(await codeOf((cb) => ftp.unlink("/s1/a.txt", cb))).toBe("EACCES");
    await failed(ftp.createWriteStream("/s1/ro.txt", { flags: "w" }));
    expect(fs.existsSync(join(tmp, "servers/s1/ro.txt"))).toBe(false);
  });

  test("files write creates and renames but delete needs manage", async () => {
    current = filesAt("write");
    await call((cb) => ftp.mkdir("/s1/w", 0o755, cb));
    await call((cb) => ftp.rename("/s1/w", "/s1/w2", cb));
    expect(await codeOf((cb) => ftp.rmdir("/s1/w2", cb))).toBe("EACCES");
    expect(await codeOf((cb) => ftp.unlink("/s1/a.txt", cb))).toBe("EACCES");
    expect(fs.existsSync(join(tmp, "servers/s1/w2"))).toBe(true);
    fs.rmdirSync(join(tmp, "servers/s1/w2"));
  });

  test("server roots and the virtual root are fixed", async () => {
    current = user();
    expect(await codeOf((cb) => ftp.rmdir("/s1", cb))).toBe("EPERM");
    expect(await codeOf((cb) => ftp.mkdir("/new", 0o755, cb))).toBe("EPERM");
    expect(await codeOf((cb) => ftp.rename("/s1/a.txt", "/s2/a.txt", cb))).toBe(
      "ENOENT",
    );
  });
});

describe("ftp settings", () => {
  test("port prefers env over config", () => {
    expect(resolveFtpPort({ enabled: true, port: 2121 }, {})).toBe(2121);
    expect(
      resolveFtpPort({ enabled: true, port: 2121 }, { FTP_PORT: "21" }),
    ).toBe(21);
    expect(resolveFtpPort({ enabled: true }, {})).toBe(21);
  });

  test("pasv host never sends 0.0.0.0", () => {
    expect(resolvePasvHost("::ffff:10.0.0.5", {})).toBe("10.0.0.5");
    expect(resolvePasvHost("0.0.0.0", {})).toBe("127.0.0.1");
    expect(resolvePasvHost("::1", {})).toBe("127.0.0.1");
    expect(resolvePasvHost("10.0.0.5", { FTP_PASV_HOST: "1.2.3.4" })).toBe(
      "1.2.3.4",
    );
  });
});
