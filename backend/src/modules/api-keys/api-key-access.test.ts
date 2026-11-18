import { describe, expect, test } from "bun:test";
import { testUser } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import type { IApiKey } from "@shared/types/api-key.types";
import {
  keyGrantsVerdict,
  keyServersVerdict,
  narrowToKey,
} from "./api-key-access";

const key = (over: Partial<IApiKey> = {}): IApiKey => ({
  id: "k1",
  userId: "u",
  name: "ci",
  prefix: "kbk_x",
  tokenHash: "h",
  grants: {},
  servers: null,
  mcp: false,
  createdAt: 0,
  expiresAt: null,
  lastUsedAt: null,
  lastUsedIp: null,
  ...over,
});

const owner = testUser("u", {
  grants: { [AccessArea.CONSOLE]: "write", [AccessArea.FILES]: "read" },
  serversRestrict: { enabled: true, allowed: ["a", "b"] },
});

describe("narrowToKey", () => {
  test("each area gets the lower of key and owner, missing ones drop", () => {
    const user = narrowToKey(
      owner,
      key({
        grants: {
          [AccessArea.CONSOLE]: "read",
          [AccessArea.FILES]: "manage",
          [AccessArea.BACKUPS]: "read",
        },
      }),
    );
    expect(user.access.levels).toEqual({
      [AccessArea.CONSOLE]: "read",
      [AccessArea.FILES]: "read",
    });
  });

  test("admin owners pass the key levels as is, but the key is no admin", () => {
    const admin = testUser("root", { isAdmin: true });
    const user = narrowToKey(
      admin,
      key({ grants: { [AccessArea.PANEL]: "manage" } }),
    );
    expect(user.isAdmin).toBe(false);
    expect(user.access.levels).toEqual({ [AccessArea.PANEL]: "manage" });
    expect(user.serversRestrict).toEqual({ enabled: false, allowed: [] });
  });

  test("server lists are intersected", () => {
    expect(narrowToKey(owner, key()).serversRestrict).toEqual({
      enabled: true,
      allowed: ["a", "b"],
    });
    expect(
      narrowToKey(owner, key({ servers: ["b", "c"] })).serversRestrict,
    ).toEqual({ enabled: true, allowed: ["b"] });
  });

  test("api access never reaches a key", () => {
    const admin = testUser("root", { isAdmin: true });
    const user = narrowToKey(
      admin,
      key({ grants: { [AccessArea.API]: "manage" } }),
    );
    expect(user.access.levels).toEqual({});
  });

  test("the key is marked on the user", () => {
    expect(narrowToKey(owner, key({ mcp: true })).apiKey).toEqual({
      id: "k1",
      name: "ci",
      mcp: true,
    });
  });
});

describe("key verdicts", () => {
  test("levels above the owner are refused", () => {
    expect(keyGrantsVerdict(owner, { console: "write" })).toBeNull();
    expect(keyGrantsVerdict(owner, { files: "write" })).toContain(
      "files write",
    );
    expect(keyGrantsVerdict(owner, { console: "manage" })).toContain(
      "Unknown level",
    );
    expect(keyGrantsVerdict(owner, { api: "write" })).not.toBeNull();
  });

  test("servers the owner can't reach are refused", () => {
    const exists = () => true;
    expect(keyServersVerdict(owner, ["a"], exists)).toBeNull();
    expect(keyServersVerdict(owner, ["a", "z"], exists)).toContain("z");
    expect(keyServersVerdict(owner, ["a"], () => false)).toContain("Unknown");
  });
});
