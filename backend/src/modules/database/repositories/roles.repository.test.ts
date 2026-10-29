import { beforeEach, describe, expect, test } from "bun:test";
import { AccessArea } from "@shared/access/areas";
import { BUILTIN_ROLES, type IRole } from "@shared/access/roles";
import { sqliteProvider } from "@/testing/sqlite";
import { testUser } from "@/testing/user";
import { RolesRepository } from "./roles.repository";
import { UsersRepository } from "./users.repository";

let roles: RolesRepository;
let users: UsersRepository;

const role = (id: string, extra: Partial<IRole> = {}): IRole => ({
  id,
  name: id,
  description: null,
  builtinKey: null,
  grants: {},
  ext: [],
  createdAt: 10,
  updatedAt: 10,
  ...extra,
});

beforeEach(() => {
  const provider = sqliteProvider();
  roles = new RolesRepository(provider);
  users = new UsersRepository(provider);
});

describe("RolesRepository", () => {
  test("a fresh panel has the built-in roles first", () => {
    roles.create(role("aaa", { name: "Aaa", createdAt: 0 }));
    expect(roles.findAll().map((r) => r.builtinKey)).toEqual([
      ...BUILTIN_ROLES.map((r) => r.key),
      null,
    ]);
  });

  test("a role reads back with its levels and keys", () => {
    roles.create(
      role("builders", {
        name: "Builders",
        description: "map makers",
        grants: { [AccessArea.FILES]: "write", [AccessArea.CONSOLE]: "read" },
        ext: ["ext.worldedit"],
      }),
    );
    expect(roles.findById("builders")).toEqual(
      role("builders", {
        name: "Builders",
        description: "map makers",
        grants: { [AccessArea.FILES]: "write", [AccessArea.CONSOLE]: "read" },
        ext: ["ext.worldedit"],
      }),
    );
    expect(roles.findByName("BUILDERS")?.id).toBe("builders");
  });

  test("update rewrites levels and keys but keeps the built-in mark", () => {
    roles.update({
      ...roles.findById("builtin:viewer")!,
      name: "Watchers",
      grants: { [AccessArea.AUDIT]: "read" },
      ext: ["ext.a"],
      updatedAt: 99,
    });
    const stored = roles.findById("builtin:viewer")!;
    expect(stored.name).toBe("Watchers");
    expect(stored.builtinKey).toBe("viewer");
    expect(stored.grants).toEqual({ [AccessArea.AUDIT]: "read" });
    expect(stored.ext).toEqual(["ext.a"]);
    expect(stored.updatedAt).toBe(99);
  });

  test("names are unique regardless of case", () => {
    roles.create(role("a", { name: "Builders" }));
    expect(() => roles.create(role("b", { name: "builders" }))).toThrow();
  });

  test("members are counted per role", () => {
    users.create(testUser("alice", { roles: ["builtin:viewer"] }));
    users.create(
      testUser("bob", { roles: ["builtin:viewer", "builtin:operator"] }),
    );

    expect(roles.memberCounts()).toEqual({
      "builtin:viewer": 2,
      "builtin:operator": 1,
    });
    expect(roles.memberIds("builtin:viewer").sort()).toEqual(["alice", "bob"]);
  });
});
