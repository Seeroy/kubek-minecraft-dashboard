import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { CompanionHubService } from "@/modules/companion/companion-hub.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import type { CompanionLiveState } from "@shared/types/companion.types";
import fs from "fs";
import os from "os";
import path from "path";
import { mightBeOnline, PlayersDataService } from "./players-data.service";
import type { PlayersContextService } from "./players-context.service";

describe("mightBeOnline", () => {
  test("nobody online", () => {
    expect(mightBeOnline({ playersOnline: 0, playersList: [] }, "Steve")).toBe(
      false,
    );
    expect(mightBeOnline(undefined, "Steve")).toBe(false);
  });

  test("full sample decides", () => {
    expect(
      mightBeOnline(
        { playersOnline: 2, playersList: ["steve", "Alex"] },
        "Steve",
      ),
    ).toBe(true);
    expect(
      mightBeOnline({ playersOnline: 1, playersList: ["Alex"] }, "Steve"),
    ).toBe(false);
  });

  test("short sample or unknown name rules nobody out", () => {
    expect(
      mightBeOnline({ playersOnline: 30, playersList: ["Alex"] }, "Steve"),
    ).toBe(true);
    expect(
      mightBeOnline({ playersOnline: 1, playersList: ["Alex"] }, null),
    ).toBe(true);
  });
});

const STEVE = "8667ba71-b85a-4004-af54-457a9734eed7";
const ALEX = "ec561538-f3fd-461d-aff5-086b22154bce";

describe("PlayersDataService", () => {
  let cwd: string;
  let root: string;

  const put = (rel: string, data: string, mtime?: number) => {
    const full = path.join(root, "servers", "s1", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
    if (mtime) fs.utimesSync(full, mtime / 1000, mtime / 1000);
  };

  const service = ({
    live = false,
    companion = null as CompanionLiveState["stats"],
    runtime = {} as { playersOnline?: number; playersList?: string[] },
  } = {}) => {
    const context = {
      serverId: "s1",
      live,
      instance: { readServerProperties: async () => null, runtime },
    };
    const contexts = {
      load: async () => context,
      loadWritable: async () => context,
    } as unknown as PlayersContextService;
    const hub = {
      state: () => ({ connected: !!companion, stats: companion }),
    } as unknown as CompanionHubService;
    return new PlayersDataService(contexts, hub);
  };

  beforeEach(() => {
    cwd = process.cwd();
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "kubek-known-")),
    );
    process.chdir(root);
    put(
      "usercache.json",
      JSON.stringify([
        { name: "Steve", uuid: STEVE },
        { name: "Alex", uuid: ALEX },
      ]),
    );
    put(`world/playerdata/${STEVE}.dat`, "x", 2_000_000);
    put(`world/playerdata/${ALEX}.dat`, "x", 1_000_000);
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("pages newest save first", async () => {
    const first = await service().list("s1", { page: 0, pageSize: 1 });
    expect(first).toEqual({
      items: [{ uuid: STEVE, name: "Steve", savedAt: 2_000_000 }],
      total: 2,
    });
    expect(
      (await service().list("s1", { page: 1, pageSize: 1 })).items[0].name,
    ).toBe("Alex");
  });

  test("search by name or uuid", async () => {
    expect(
      (await service().list("s1", { page: 0, pageSize: 10, search: "ale" }))
        .total,
    ).toBe(1);
    expect(
      (
        await service().list("s1", {
          page: 0,
          pageSize: 10,
          search: "8667ba71",
        })
      ).items[0].name,
    ).toBe("Steve");
  });

  test("details by name", async () => {
    expect((await service().details("s1", "steve")).uuid).toBe(STEVE);
    await expect(service().details("s1", "Nobody")).rejects.toThrow(
      NotFoundException,
    );
  });

  test("companion list decides who is online", async () => {
    const stats = {
      players: [{ uuid: STEVE }],
    } as unknown as CompanionLiveState["stats"];
    await expect(
      service({ live: true, companion: stats }).reset("s1", STEVE),
    ).rejects.toThrow(ConflictException);
    // A short status sample would block this, the plugin knows better
    expect(
      await service({
        live: true,
        companion: stats,
        runtime: { playersOnline: 5, playersList: [] },
      }).reset("s1", ALEX),
    ).toEqual({ deleted: 1 });
  });
});
