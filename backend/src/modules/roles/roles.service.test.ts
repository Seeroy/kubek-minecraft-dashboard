import { beforeEach, describe, expect, test } from "bun:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { AppEventsService } from "@/core/events/app-events.service";
import { RolesRepository } from "@/modules/database/repositories/roles.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { sqliteProvider } from "@/testing/sqlite";
import { testUser, userWith } from "@/testing/user";
import { RolesService } from "./roles.service";

const { ACCOUNTS, CONSOLE, FILES, PANEL } = AccessArea;

const admin = testUser("admin", { isAdmin: true });
const manager = userWith(
  { [ACCOUNTS]: "manage", [CONSOLE]: "write", [FILES]: "read" },
  { id: "m", extPermissions: ["ext.map"] },
);

let users: UsersRepository;
let service: RolesService;
let changed: string[];

function caught(run: () => unknown): unknown {
  try {
    run();
  } catch (e) {
    return e;
  }
  throw new Error("expected a throw");
}

const codeOf = (err: unknown) =>
  (err as { getResponse(): { code?: string } }).getResponse().code;

beforeEach(() => {
  const sqlite = sqliteProvider();
  users = new UsersRepository(sqlite);
  const events = new AppEventsService();
  changed = [];
  events.on("user.access_changed", ({ userId }) => void changed.push(userId));
  service = new RolesService(new RolesRepository(sqlite), users, events);
});

describe("RolesService list", () => {
  test("roles come with the number of accounts holding them", () => {
    users.create(testUser("a", { roles: ["builtin:viewer"] }));
    users.create(testUser("b", { roles: ["builtin:viewer"] }));

    const roles = service.list();

    expect(roles.find((r) => r.id === "builtin:viewer")?.members).toBe(2);
    expect(roles.find((r) => r.id === "builtin:operator")?.members).toBe(0);
  });

  test("an unknown role is a not found", () => {
    expect(caught(() => service.get("nope"))).toBeInstanceOf(NotFoundException);
  });
});

describe("RolesService create", () => {
  test("a role is stored with its levels and keys", () => {
    const role = service.create(admin, {
      name: " Builders ",
      description: "map makers",
      grants: { [FILES]: "write" },
      ext: ["ext.map", "ext.map"],
    });

    expect(service.get(role.id)).toMatchObject({
      name: "Builders",
      description: "map makers",
      builtinKey: null,
      grants: { [FILES]: "write" },
      ext: ["ext.map"],
      members: 0,
    });
  });

  test("a name taken in another case is a conflict with a code", () => {
    service.create(admin, { name: "Builders" });

    const err = caught(() => service.create(admin, { name: "builders" }));

    expect(err).toBeInstanceOf(ConflictException);
    expect(codeOf(err)).toBe("ROLE_NAME_TAKEN");
  });

  test("a non-admin can only create a role within its own access", () => {
    expect(
      caught(() =>
        service.create(manager, { name: "Big", grants: { [PANEL]: "manage" } }),
      ),
    ).toBeInstanceOf(ForbiddenException);
    expect(
      caught(() => service.create(manager, { name: "Ext", ext: ["ext.x"] })),
    ).toBeInstanceOf(ForbiddenException);
    expect(
      service.create(manager, {
        name: "Small",
        grants: { [CONSOLE]: "write" },
        ext: ["ext.map"],
      }).name,
    ).toBe("Small");
  });
});

describe("RolesService update", () => {
  test("a built-in role keeps its name but its levels can change", () => {
    const err = caught(() =>
      service.update(admin, "builtin:viewer", { name: "Watchers" }),
    );
    expect(err).toBeInstanceOf(BadRequestException);
    expect(codeOf(err)).toBe("ROLE_BUILTIN");

    const { before, after } = service.update(admin, "builtin:viewer", {
      name: "Viewer",
      grants: { [CONSOLE]: "read" },
    });
    expect(before.grants[AccessArea.POWER]).toBe("read");
    expect(after.grants).toEqual({ [CONSOLE]: "read" });
    expect(after.name).toBe("Viewer");
  });

  test("renaming to another role's name is a conflict, own name in a new case is fine", () => {
    const a = service.create(admin, { name: "Alpha" });
    service.create(admin, { name: "Beta" });

    expect(
      caught(() => service.update(admin, a.id, { name: "BETA" })),
    ).toBeInstanceOf(ConflictException);
    expect(service.update(admin, a.id, { name: "ALPHA" }).after.name).toBe(
      "ALPHA",
    );
  });

  test("fields left out stay as they were", () => {
    const role = service.create(admin, {
      name: "Alpha",
      description: "first",
      grants: { [FILES]: "read" },
      ext: ["ext.a"],
    });

    const { after } = service.update(admin, role.id, { ext: [] });

    expect(after).toMatchObject({
      name: "Alpha",
      description: "first",
      grants: { [FILES]: "read" },
      ext: [],
    });
  });

  test("a non-admin can't raise a role above its access or edit one already above", () => {
    const small = service.create(admin, {
      name: "Small",
      grants: { [CONSOLE]: "read" },
    });
    const big = service.create(admin, {
      name: "Big",
      grants: { [FILES]: "manage" },
    });

    expect(
      caught(() =>
        service.update(manager, small.id, { grants: { [FILES]: "write" } }),
      ),
    ).toBeInstanceOf(ForbiddenException);
    expect(
      caught(() =>
        service.update(manager, big.id, { grants: { [CONSOLE]: "read" } }),
      ),
    ).toBeInstanceOf(ForbiddenException);
    expect(
      service.update(manager, small.id, { grants: { [CONSOLE]: "write" } })
        .after.grants,
    ).toEqual({ [CONSOLE]: "write" });
  });
});

describe("RolesService remove", () => {
  test("a custom role is deleted and its members lose it", () => {
    const role = service.create(admin, { name: "Temp" });
    users.create(testUser("a", { roles: [role.id] }));

    expect(service.remove(admin, role.id).members).toBe(1);

    expect(service.list().some((r) => r.id === role.id)).toBe(false);
    expect(users.findById("a")!.roles).toEqual([]);
  });

  test("a built-in role can't be deleted", () => {
    const err = caught(() => service.remove(admin, "builtin:viewer"));

    expect(codeOf(err)).toBe("ROLE_BUILTIN");
  });

  test("a non-admin can't delete a role above its access", () => {
    const big = service.create(admin, {
      name: "Big",
      grants: { [PANEL]: "manage" },
    });

    expect(caught(() => service.remove(manager, big.id))).toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe("RolesService members", () => {
  const restricted = userWith(
    { [ACCOUNTS]: "manage", [CONSOLE]: "write" },
    { id: "r", serversRestrict: { enabled: true, allowed: ["a"] } },
  );
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  test("a restricted actor can't change a role held outside its servers", () => {
    const chat = service.create(admin, {
      name: "Chat",
      grants: { [CONSOLE]: "read" },
    });
    users.create(testUser("everywhere", { roles: [chat.id] }));

    for (const run of [
      () => service.update(restricted, chat.id, { grants: {} }),
      () => service.remove(restricted, chat.id),
    ]) {
      expect(caught(run)).toBeInstanceOf(ForbiddenException);
    }
  });

  test("a restricted actor changes a role held only on its servers", () => {
    const chat = service.create(admin, { name: "Chat" });
    users.create(
      testUser("scoped", {
        roles: [chat.id],
        serversRestrict: { enabled: true, allowed: ["a"] },
      }),
    );

    expect(
      service.update(restricted, chat.id, { grants: { [CONSOLE]: "read" } })
        .after.grants,
    ).toEqual({ [CONSOLE]: "read" });
  });

  test("members are told their access changed on update and delete", async () => {
    const chat = service.create(admin, { name: "Chat" });
    users.create(testUser("a", { roles: [chat.id] }));
    users.create(testUser("b", { roles: [chat.id] }));

    service.update(admin, chat.id, { description: "only text" });
    await settle();
    expect(changed).toEqual([]);

    service.update(admin, chat.id, { grants: { [CONSOLE]: "read" } });
    await settle();
    expect(changed.sort()).toEqual(["a", "b"]);

    changed = [];
    service.remove(admin, chat.id);
    await settle();
    expect(changed.sort()).toEqual(["a", "b"]);
  });
});

describe("RolesService duplicate", () => {
  test("a copy is a custom role with the same access and a free name", () => {
    const first = service.duplicate(admin, "builtin:viewer");
    const second = service.duplicate(admin, "builtin:viewer");

    expect(first.name).toBe("Viewer (copy)");
    expect(second.name).toBe("Viewer (copy 2)");
    expect(first.builtinKey).toBeNull();
    expect(first.grants).toEqual(service.get("builtin:viewer").grants);
  });

  test("a given name is used for the copy", () => {
    expect(service.duplicate(admin, "builtin:viewer", "Guests").name).toBe(
      "Guests",
    );
  });

  test("a non-admin can't copy a role above its access", () => {
    expect(
      caught(() => service.duplicate(manager, "builtin:server-admin")),
    ).toBeInstanceOf(ForbiddenException);
  });
});

describe("RolesService resolve", () => {
  test("known ids come back as roles, an unknown one is a bad request", () => {
    expect(service.resolve(["builtin:viewer"]).map((r) => r.name)).toEqual([
      "Viewer",
    ]);
    const err = caught(() => service.resolve(["builtin:viewer", "nope"]));
    expect(codeOf(err)).toBe("ROLE_UNKNOWN");
  });
});
