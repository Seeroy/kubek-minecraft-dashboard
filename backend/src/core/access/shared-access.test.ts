import { describe, expect, test } from "bun:test";
import {
  AccessArea,
  AREA_LEVELS,
  accessWithin,
  mergeAccess,
  PANEL_AREAS,
  SERVER_AREAS,
} from "@shared/access/areas";
import {
  type AccessSubject,
  can,
  canOnServer,
  canSeeServer,
  hasExtPermission,
} from "@shared/access/can";
import {
  accessFromLegacy,
  LEGACY_PERMISSION_ACCESS,
  legacyFromAccess,
} from "@shared/access/legacy";
import { BUILTIN_ROLES } from "@shared/access/roles";

const subject = (
  levels: AccessSubject["access"]["levels"],
  extra: Partial<AccessSubject> = {},
): AccessSubject => ({ access: { levels, ext: [] }, ...extra });

describe("areas", () => {
  test("every area is either a server or a panel one", () => {
    expect([...SERVER_AREAS, ...PANEL_AREAS].sort()).toEqual(
      Object.values(AccessArea).sort(),
    );
  });

  test("merging keeps the highest level", () => {
    expect(
      mergeAccess(
        { [AccessArea.FILES]: "read", [AccessArea.CONSOLE]: "write" },
        { [AccessArea.FILES]: "manage" },
      ),
    ).toEqual({ [AccessArea.FILES]: "manage", [AccessArea.CONSOLE]: "write" });
  });

  test("built-in roles and the legacy map only use levels their areas have", () => {
    const maps = [
      ...BUILTIN_ROLES.map((r) => r.grants),
      ...Object.values(LEGACY_PERMISSION_ACCESS),
    ];
    for (const map of maps) {
      for (const [area, level] of Object.entries(map)) {
        expect(AREA_LEVELS[area as AccessArea]).toContain(level);
      }
    }
  });

  test("each built-in role includes the one before it", () => {
    const [viewer, moderator, operator] = BUILTIN_ROLES;
    expect(accessWithin(viewer!.grants, moderator!.grants)).toBe(true);
    expect(accessWithin(moderator!.grants, operator!.grants)).toBe(true);
  });
});

describe("can", () => {
  test("levels are ordered", () => {
    const u = subject({ [AccessArea.FILES]: "write" });
    expect(can(u, AccessArea.FILES, "read")).toBe(true);
    expect(can(u, AccessArea.FILES, "write")).toBe(true);
    expect(can(u, AccessArea.FILES, "manage")).toBe(false);
    expect(can(u, AccessArea.CONSOLE, "read")).toBe(false);
    expect(can(null, AccessArea.FILES, "read")).toBe(false);
  });

  test("admins can do anything anywhere", () => {
    const admin = subject(
      {},
      { isAdmin: true, serversRestrict: { enabled: true, allowed: [] } },
    );
    expect(canOnServer(admin, AccessArea.FILES, "manage", "s1")).toBe(true);
    expect(hasExtPermission(admin, "ext.x")).toBe(true);
  });

  test("server areas also need the server in the account's list", () => {
    const u = subject(
      { [AccessArea.CONSOLE]: "read" },
      { serversRestrict: { enabled: true, allowed: ["mine"] } },
    );
    expect(canOnServer(u, AccessArea.CONSOLE, "read", "mine")).toBe(true);
    expect(canOnServer(u, AccessArea.CONSOLE, "read", "other")).toBe(false);
    expect(canSeeServer(u, "mine")).toBe(true);
    expect(canSeeServer(subject({ [AccessArea.AUDIT]: "read" }), "mine")).toBe(
      false,
    );
  });

  test("extension keys come from the effective list", () => {
    const u: AccessSubject = { access: { levels: {}, ext: ["ext.a"] } };
    expect(hasExtPermission(u, "ext.a")).toBe(true);
    expect(hasExtPermission(u, "ext.b")).toBe(false);
  });
});

describe("legacy permissions", () => {
  test("old keys survive a round trip", () => {
    const keys = Object.keys(LEGACY_PERMISSION_ACCESS);
    expect(legacyFromAccess(accessFromLegacy(keys)).sort()).toEqual(
      keys.sort(),
    );
    for (const key of keys) {
      expect(legacyFromAccess(accessFromLegacy([key]))).toContain(key);
    }
  });

  test("unknown keys give nothing", () => {
    expect(accessFromLegacy(["ext.x"])).toEqual({});
  });
});
