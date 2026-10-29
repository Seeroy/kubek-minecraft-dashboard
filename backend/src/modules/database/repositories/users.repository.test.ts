import { beforeEach, describe, expect, test } from "bun:test";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { ServerStatus } from "@shared/types/server/server.types";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import { testUser } from "@/testing/user";
import { RolesRepository } from "./roles.repository";
import { FtpCredentialsRepository } from "./ftp-credentials.repository";
import { ServersRepository } from "./servers.repository";
import { UserSessionsRepository } from "./user-sessions.repository";
import { UsersRepository } from "./users.repository";

let users: UsersRepository;
let servers: ServersRepository;
let sessions: UserSessionsRepository;
let ftp: FtpCredentialsRepository;
let roles: RolesRepository;

const user = (id: string, extra: Partial<IUser> = {}): IUser =>
  testUser(id, extra);

const addServer = (name: string) =>
  servers.create({
    name,
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: false, attempts: 0 },
    blueprintId: "paper",
    variables: {},
  }).id;

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  users = new UsersRepository(provider);
  servers = new ServersRepository(provider);
  sessions = new UserSessionsRepository(provider);
  ftp = new FtpCredentialsRepository(provider);
  roles = new RolesRepository(provider);
});

describe("UsersRepository", () => {
  test("a user reads back with every field mapped", () => {
    const lobby = addServer("Lobby");
    users.create(
      user("alice", {
        password: "argon",
        roles: ["builtin:viewer"],
        grants: { [AccessArea.FILES]: "manage" },
        extPermissions: ["ext.x"],
        serversRestrict: { enabled: true, allowed: [lobby] },
        isAdmin: true,
        oobeCompleted: true,
        totpSecret: "JBSWY3DP",
        totpEnabled: true,
        telegram2faEnabled: true,
        twofaPrimary: "telegram",
        dashboardLayout: '{"lg":[]}',
        lastSeenWhatsNewVersion: "4.0.0",
        skinName: "Notch",
      }),
    );

    expect(users.findById("alice")).toEqual({
      id: "alice",
      username: "alice",
      password: "argon",
      roles: ["builtin:viewer"],
      grants: { [AccessArea.FILES]: "manage" },
      extPermissions: ["ext.x"],
      access: {
        levels: {
          ...roles.findById("builtin:viewer")!.grants,
          [AccessArea.FILES]: "manage",
        },
        ext: ["ext.x"],
      },
      serversRestrict: { enabled: true, allowed: [lobby] },
      isAdmin: true,
      oobeCompleted: true,
      totpSecret: "JBSWY3DP",
      totpEnabled: true,
      telegram2faEnabled: true,
      twofaPrimary: "telegram",
      dashboardLayout: '{"lg":[]}',
      lastSeenWhatsNewVersion: "4.0.0",
      skinName: "Notch",
      ftpPasswordSetAt: null,
    });
  });

  test("optional fields left out come back as false and null", () => {
    users.create(user("bob"));
    expect(users.findById("bob")).toEqual({
      id: "bob",
      username: "bob",
      password: "hash",
      roles: [],
      grants: {},
      extPermissions: [],
      access: { levels: {}, ext: [] },
      serversRestrict: { enabled: false, allowed: [] },
      isAdmin: false,
      oobeCompleted: false,
      totpSecret: null,
      totpEnabled: false,
      telegram2faEnabled: false,
      twofaPrimary: null,
      dashboardLayout: null,
      lastSeenWhatsNewVersion: null,
      skinName: null,
      ftpPasswordSetAt: null,
    });
  });

  test("a totp secret is dropped while totp is off", () => {
    users.create(user("alice", { totpSecret: "SECRET", totpEnabled: false }));
    const stored = users.findById("alice");
    expect(stored?.totpSecret).toBeNull();
    expect(stored?.totpEnabled).toBe(false);
  });

  test("allowed servers that do not exist are skipped", () => {
    const lobby = addServer("Lobby");
    users.create(
      user("alice", {
        serversRestrict: { enabled: true, allowed: ["ghost", lobby] },
      }),
    );
    expect(users.findById("alice")?.serversRestrict.allowed).toEqual([lobby]);
  });

  test("roles, keys and servers keep their order and drop duplicates", () => {
    const a = addServer("A");
    const b = addServer("B");
    users.create(
      user("alice", {
        roles: ["builtin:operator", "builtin:viewer", "builtin:operator"],
        extPermissions: ["ext.b", "ext.a", "ext.b"],
        serversRestrict: { enabled: true, allowed: [b, a, b] },
      }),
    );
    const stored = users.findById("alice");
    expect(stored?.roles).toEqual(["builtin:operator", "builtin:viewer"]);
    expect(stored?.extPermissions).toEqual(["ext.b", "ext.a"]);
    expect(stored?.serversRestrict.allowed).toEqual([b, a]);
  });

  test("effective access is the highest level from roles and own grants", () => {
    roles.create({
      id: "files",
      name: "Files",
      description: null,
      builtinKey: null,
      grants: { [AccessArea.FILES]: "write", [AccessArea.AUDIT]: "read" },
      ext: ["ext.role"],
      createdAt: 1,
      updatedAt: 1,
    });
    users.create(
      user("alice", {
        roles: ["builtin:viewer", "files"],
        grants: { [AccessArea.FILES]: "read", [AccessArea.CONSOLE]: "write" },
        extPermissions: ["ext.own", "ext.role"],
      }),
    );

    const { access } = users.findById("alice")!;

    expect(access.levels[AccessArea.FILES]).toBe("write");
    expect(access.levels[AccessArea.CONSOLE]).toBe("write");
    expect(access.levels[AccessArea.AUDIT]).toBe("read");
    expect(access.levels[AccessArea.POWER]).toBe("read");
    expect(access.ext.sort()).toEqual(["ext.own", "ext.role"]);
  });

  test("unknown roles and levels an area doesn't have are skipped", () => {
    users.create(
      user("alice", {
        roles: ["ghost"],
        grants: {
          [AccessArea.MONITORING]: "manage",
          [AccessArea.FILES]: "read",
        },
      }),
    );
    const stored = users.findById("alice")!;
    expect(stored.roles).toEqual([]);
    expect(stored.grants).toEqual({ [AccessArea.FILES]: "read" });
  });

  test("deleting a role takes it from its members", () => {
    users.create(user("alice", { roles: ["builtin:viewer"] }));
    roles.delete("builtin:viewer");
    expect(users.findById("alice")?.roles).toEqual([]);
    expect(users.findById("alice")?.access.levels).toEqual({});
  });

  test("update rewrites access and server access", () => {
    const a = addServer("A");
    const b = addServer("B");
    users.create(
      user("alice", {
        roles: ["builtin:viewer"],
        grants: { [AccessArea.BACKUPS]: "manage" },
        serversRestrict: { enabled: true, allowed: [a] },
      }),
    );

    users.update(
      user("alice", {
        username: "alice2",
        grants: { [AccessArea.PANEL]: "manage" },
        serversRestrict: { enabled: true, allowed: [b] },
        isAdmin: true,
      }),
    );

    const stored = users.findById("alice");
    expect(stored?.username).toBe("alice2");
    expect(stored?.isAdmin).toBe(true);
    expect(stored?.roles).toEqual([]);
    expect(stored?.grants).toEqual({ [AccessArea.PANEL]: "manage" });
    expect(stored?.serversRestrict.allowed).toEqual([b]);
    expect(users.findByUsername("alice")).toBeNull();
    expect(users.findByUsername("alice2")?.id).toBe("alice");
  });

  test("usernames are unique", () => {
    users.create(user("a", { username: "steve" }));
    expect(() => users.create(user("b", { username: "steve" }))).toThrow(
      "UNIQUE constraint failed: users.username",
    );
    expect(users.findAll().map((u) => u.id)).toEqual(["a"]);
  });

  test("a failed create leaves no access behind", () => {
    users.create(user("a", { username: "steve" }));
    expect(() =>
      users.create(
        user("b", {
          username: "steve",
          grants: { [AccessArea.BACKUPS]: "manage" },
        }),
      ),
    ).toThrow();
    users.create(user("b", { username: "alex" }));
    expect(users.findById("b")?.grants).toEqual({});
  });

  test("shows when the ftp password was set", () => {
    users.create(user("alice"));
    ftp.set("alice", "hash", 1234);
    expect(users.findById("alice")?.ftpPasswordSetAt).toBe(1234);
  });

  test("deleting a user removes their sessions, access and ftp password", () => {
    const lobby = addServer("Lobby");
    users.create(
      user("alice", {
        roles: ["builtin:viewer"],
        grants: { [AccessArea.BACKUPS]: "manage" },
        serversRestrict: { enabled: true, allowed: [lobby] },
      }),
    );
    sessions.create({
      id: "s1",
      userId: "alice",
      tokenHash: "t1",
      ip: null,
      userAgent: null,
      createdAt: 1,
      lastSeenAt: 1,
      expiresAt: null,
      revokedAt: null,
    });
    ftp.set("alice", "hash", 1);

    users.delete("alice");

    expect(users.findById("alice")).toBeNull();
    expect(sessions.findById("s1")).toBeNull();
    expect(ftp.findByUserId("alice")).toBeNull();
    // same id again must not inherit old access
    users.create(user("alice"));
    expect(users.findById("alice")?.access).toEqual({ levels: {}, ext: [] });
    expect(users.findById("alice")?.serversRestrict.allowed).toEqual([]);
  });
});
