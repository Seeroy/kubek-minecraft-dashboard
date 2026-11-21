import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import {
  deletePlayerFiles,
  listPlayerData,
  readPlayerFile,
  worldFolder,
} from "./player-files";

const STEVE = "8667ba71-b85a-4004-af54-457a9734eed7";
const ALEX = "ec561538-f3fd-461d-aff5-086b22154bce";

let cwd: string;
let root: string;

const put = (rel: string, data = "x", mtime?: number) => {
  const full = path.join(root, "servers", "s1", rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, data);
  if (mtime) fs.utimesSync(full, mtime / 1000, mtime / 1000);
};
const exists = (rel: string) =>
  fs.existsSync(path.join(root, "servers", "s1", rel));

beforeEach(() => {
  cwd = process.cwd();
  root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kubek-players-")),
  );
  process.chdir(root);
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("worldFolder", () => {
  test("level-name or the default", () => {
    expect(worldFolder({ "level-name": "survival" })).toBe("survival");
    expect(worldFolder({ "level-name": "  " })).toBe("world");
    expect(worldFolder(null)).toBe("world");
  });
});

describe("listPlayerData", () => {
  test("both layouts, newest save wins, junk is skipped", async () => {
    put(`world/playerdata/${STEVE}.dat`, "a", 1_000_000);
    put(`world/players/data/${STEVE}.dat`, "b", 2_000_000);
    put(`world/playerdata/${ALEX}.dat_old`);
    put("world/playerdata/notes.dat");

    const saved = await listPlayerData("s1", "world");
    expect([...saved.keys()]).toEqual([STEVE]);
    expect(saved.get(STEVE)).toBe(2_000_000);
  });

  test("a world without player data", async () => {
    expect((await listPlayerData("s1", "world")).size).toBe(0);
  });
});

describe("readPlayerFile", () => {
  test("newest of the two layouts", async () => {
    put(`world/stats/${STEVE}.json`, "old", 1_000_000);
    put(`world/players/stats/${STEVE}.json`, "new", 2_000_000);
    expect(
      (await readPlayerFile("s1", "world", "stats", STEVE))?.data.toString(),
    ).toBe("new");
    expect(await readPlayerFile("s1", "world", "data", STEVE)).toBeNull();
  });

  test("a level-name outside the server is refused", async () => {
    await expect(
      readPlayerFile("s1", "../s2", "data", STEVE),
    ).rejects.toThrow();
  });
});

describe("deletePlayerFiles", () => {
  test("removes every file of one player only", async () => {
    put(`world/playerdata/${STEVE}.dat`);
    put(`world/playerdata/${STEVE}.dat_old`);
    put(`world/stats/${STEVE}.json`);
    put(`world/players/advancements/${STEVE}.json`);
    put(`world/playerdata/${ALEX}.dat`);

    expect(await deletePlayerFiles("s1", "world", STEVE)).toBe(4);
    expect(exists(`world/playerdata/${STEVE}.dat`)).toBe(false);
    expect(exists(`world/playerdata/${ALEX}.dat`)).toBe(true);
    expect(await deletePlayerFiles("s1", "world", STEVE)).toBe(0);
  });
});
