import { describe, expect, test } from "bun:test";
import { AccessArea } from "@shared/access/areas";
import type { AccessMap } from "@shared/access/areas";
import { testUser, userWith } from "@/testing/user";
import {
  type AccessPlan,
  canChangeRoleMembers,
  canGrant,
  canManageAccount,
  canManageFtpPassword,
  canUseRole,
  effectiveAccess,
  needsSessionRevoke,
} from "./accounts.policy";

const { ACCOUNTS, AUDIT, CONSOLE, FILES, PANEL, PLAYERS } = AccessArea;

const manager = userWith(
  { [ACCOUNTS]: "write", [CONSOLE]: "write", [FILES]: "read" },
  { id: "m", extPermissions: ["ext.map"] },
);
const restrictedManager = userWith(
  { [ACCOUNTS]: "write", [CONSOLE]: "read" },
  { id: "rm", serversRestrict: { enabled: true, allowed: ["a", "b"] } },
);
const admin = testUser("admin", { isAdmin: true });

const role = (name: string, grants: AccessMap, ext: string[] = []) => ({
  name,
  grants,
  ext,
});

const plan = (over: Partial<AccessPlan> = {}): AccessPlan => ({
  roles: [],
  grants: {},
  extPermissions: [],
  serversRestrict: { enabled: false, allowed: [] },
  ...over,
});

describe("effectiveAccess", () => {
  test("takes the highest level from roles and personal grants", () => {
    expect(
      effectiveAccess(
        [
          role("a", { [CONSOLE]: "read", [FILES]: "write" }, ["ext.a"]),
          role("b", { [CONSOLE]: "write" }, ["ext.a", "ext.b"]),
        ],
        { [FILES]: "read", [AUDIT]: "read" },
        ["ext.c"],
      ),
    ).toEqual({
      levels: { [CONSOLE]: "write", [FILES]: "write", [AUDIT]: "read" },
      ext: ["ext.a", "ext.b", "ext.c"],
    });
  });
});

describe("canManageAccount", () => {
  test("non-admin can't touch admins", () => {
    expect(canManageAccount(manager, admin)).not.toBeNull();
    expect(canManageAccount(manager, testUser("u"))).toBeNull();
    expect(canManageAccount(admin, admin)).toBeNull();
  });

  test("account with a level above the actor's can't be edited or deleted", () => {
    const target = userWith({ [FILES]: "manage" });
    expect(canManageAccount(manager, target)).toContain("files manage");
    expect(canManageAccount(admin, target)).toBeNull();
  });

  test("account with an extension key the actor lacks is out of reach", () => {
    const target = testUser("u", { extPermissions: ["ext.secret"] });
    expect(canManageAccount(manager, target)).toContain("ext.secret");
  });

  test("account within the actor's access can be managed", () => {
    const target = userWith(
      { [CONSOLE]: "read", [FILES]: "read" },
      { extPermissions: ["ext.map"] },
    );
    expect(canManageAccount(manager, target)).toBeNull();
  });

  test("restricted actor can't take over an account that sees all servers", () => {
    const viewer = userWith({ [CONSOLE]: "read" }, { username: "viewer1" });
    expect(canManageAccount(restrictedManager, viewer)).toBe(
      "Account can access all servers",
    );
    expect(canManageAccount(manager, viewer)).toBeNull();
  });

  test("restricted actor manages only accounts within its servers", () => {
    const inside = userWith(
      { [CONSOLE]: "read" },
      { serversRestrict: { enabled: true, allowed: ["a"] } },
    );
    const wider = userWith(
      { [CONSOLE]: "read" },
      { serversRestrict: { enabled: true, allowed: ["a", "z"] } },
    );
    expect(canManageAccount(restrictedManager, inside)).toBeNull();
    expect(canManageAccount(restrictedManager, wider)).toContain("z");
    expect(canManageAccount(restrictedManager, restrictedManager)).toBeNull();
  });
});

describe("canChangeRoleMembers", () => {
  const inside = testUser("in", {
    serversRestrict: { enabled: true, allowed: ["b"] },
  });

  test("restricted actor can't change a role used outside its servers", () => {
    expect(canChangeRoleMembers(restrictedManager, [inside])).toBeNull();
    expect(
      canChangeRoleMembers(restrictedManager, [inside, testUser("viewer1")]),
    ).toContain("viewer1");
    expect(canChangeRoleMembers(restrictedManager, [admin])).toContain("admin");
  });

  test("actors that see all servers are not limited", () => {
    expect(canChangeRoleMembers(manager, [testUser("viewer1")])).toBeNull();
  });
});

describe("canGrant", () => {
  test("admin may give anything", () => {
    expect(
      canGrant(
        admin,
        plan({
          roles: [role("all", { [PANEL]: "manage" })],
          grants: { [FILES]: "manage" },
          extPermissions: ["ext.any"],
        }),
      ),
    ).toBeNull();
  });

  test("non-admin can't give a personal level above its own", () => {
    expect(canGrant(manager, plan({ grants: { [FILES]: "write" } }))).toContain(
      "files write",
    );
    expect(canGrant(manager, plan({ grants: { [FILES]: "read" } }))).toBeNull();
  });

  test("non-admin can't assign a role above its own access", () => {
    expect(
      canGrant(
        manager,
        plan({ roles: [role("Ops", { [PLAYERS]: "manage" })] }),
      ),
    ).toContain('role "Ops"');
    expect(
      canGrant(
        manager,
        plan({ roles: [role("Chat", { [CONSOLE]: "write" })] }),
      ),
    ).toBeNull();
  });

  test("non-admin can't give extension keys it lacks", () => {
    expect(
      canGrant(manager, plan({ extPermissions: ["ext.other"] })),
    ).toContain("ext.other");
    expect(canGrant(manager, plan({ extPermissions: ["ext.map"] }))).toBeNull();
    expect(
      canGrant(manager, plan({ roles: [role("Ext", {}, ["ext.other"])] })),
    ).toContain("ext.other");
  });

  test("non-admin can't escalate itself", () => {
    expect(
      canGrant(
        manager,
        plan({ grants: { ...manager.grants, [ACCOUNTS]: "manage" } }),
      ),
    ).toContain("accounts manage");
  });

  test("restricted actor can't lift a restriction", () => {
    expect(canGrant(restrictedManager, plan())).toBe(
      "Can't give access to all servers",
    );
  });

  test("restricted actor can't add foreign servers", () => {
    expect(
      canGrant(
        restrictedManager,
        plan({ serversRestrict: { enabled: true, allowed: ["a", "z"] } }),
      ),
    ).toContain("z");
    expect(
      canGrant(
        restrictedManager,
        plan({ serversRestrict: { enabled: true, allowed: ["a", "b"] } }),
      ),
    ).toBeNull();
  });

  test("restricted actor creating an unrestricted account is refused", () => {
    const viewer = plan({ grants: { [CONSOLE]: "read" } });
    expect(canGrant(restrictedManager, viewer)).not.toBeNull();
    expect(
      canGrant(restrictedManager, {
        ...viewer,
        serversRestrict: { enabled: true, allowed: ["b"] },
      }),
    ).toBeNull();
  });

  test("restricted actor can't keep a target unrestricted", () => {
    expect(canGrant(restrictedManager, plan())).not.toBeNull();
  });
});

describe("canUseRole", () => {
  test("a role within the actor's levels and keys is allowed", () => {
    expect(
      canUseRole(manager, role("r", { [CONSOLE]: "write" }, ["ext.map"])),
    ).toBeNull();
  });

  test("a role above the actor's access is refused for non-admins only", () => {
    const strong = role("r", { [FILES]: "manage" }, ["ext.x"]);
    expect(canUseRole(manager, strong)).toBe(
      "Role gives access above yours: files manage, ext.x",
    );
    expect(canUseRole(admin, strong)).toBeNull();
  });
});

describe("needsSessionRevoke", () => {
  test("password or access change signs out", () => {
    const before = userWith(
      { [CONSOLE]: "read" },
      { roles: ["r1"], extPermissions: ["ext.a"] },
    );
    expect(needsSessionRevoke(before, { ...before })).toBe(false);
    expect(needsSessionRevoke(before, { ...before, username: "x" })).toBe(
      false,
    );
    expect(
      needsSessionRevoke(before, { ...before, grants: { [CONSOLE]: "read" } }),
    ).toBe(false);
    expect(needsSessionRevoke(before, { ...before, password: "new" })).toBe(
      true,
    );
    expect(needsSessionRevoke(before, { ...before, roles: [] })).toBe(true);
    expect(
      needsSessionRevoke(before, { ...before, grants: { [CONSOLE]: "write" } }),
    ).toBe(true);
    expect(needsSessionRevoke(before, { ...before, extPermissions: [] })).toBe(
      true,
    );
    expect(needsSessionRevoke(before, { ...before, isAdmin: true })).toBe(true);
    expect(
      needsSessionRevoke(before, {
        ...before,
        serversRestrict: { enabled: true, allowed: ["a"] },
      }),
    ).toBe(true);
  });
});

describe("canManageFtpPassword", () => {
  test("owner manages its own", () => {
    const plain = testUser("p");
    expect(canManageFtpPassword(plain, plain)).toBeNull();
  });

  test("others need accounts write", () => {
    const reader = userWith(
      { [ACCOUNTS]: "read", [FILES]: "manage" },
      { id: "p" },
    );
    expect(canManageFtpPassword(reader, testUser("u"))).not.toBeNull();
    expect(canManageFtpPassword(manager, testUser("u"))).toBeNull();
    expect(canManageFtpPassword(admin, testUser("u"))).toBeNull();
  });

  test("admin passwords are reset by admins only", () => {
    expect(canManageFtpPassword(manager, admin)).not.toBeNull();
    expect(
      canManageFtpPassword(testUser("a2", { isAdmin: true }), admin),
    ).toBeNull();
  });
});
