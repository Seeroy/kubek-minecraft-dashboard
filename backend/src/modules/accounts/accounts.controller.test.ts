import { beforeEach, describe, expect, test } from "bun:test";
import { ForbiddenException } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { AppEventsService } from "@/core/events/app-events.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { RolesRepository } from "@/modules/database/repositories/roles.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import { RolesService } from "@/modules/roles/roles.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { testUser, userWith } from "@/testing/user";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";

const { ACCOUNTS, CONSOLE, FILES, POWER } = AccessArea;

let users: UsersRepository;
let audit: AuditLogService;
let controller: AccountsController;
let events: AppEventsService;

const request = () => fake<Request>({ headers: {}, params: {} });

const accessEntries = () =>
  audit.query({ action: AuditAction.ACCOUNT_ACCESS_CHANGE }).items;

function caught(run: () => unknown): unknown {
  try {
    run();
  } catch (e) {
    return e;
  }
  throw new Error("expected a throw");
}

async function rejected(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error("expected a rejection");
}

// The actor is read back so its access is computed like on a real request
function stored(user: IUser): IUser {
  users.create(user);
  return users.findById(user.id)!;
}

beforeEach(() => {
  const sqlite = sqliteProvider();
  users = new UsersRepository(sqlite);
  const servers = new ServersRepository(sqlite);
  audit = new AuditLogService(new AuditLogsRepository(sqlite), servers);
  events = new AppEventsService();
  controller = new AccountsController(
    new AccountsService(users),
    fake<PasswordRecheckService>(),
    servers,
    fake<SessionsService>({ revokeAllForUser: () => {} }),
    events,
    new RolesService(new RolesRepository(sqlite), users, events),
    audit,
  );
});

describe("AccountsController access", () => {
  test("a created account gets its roles and levels and the access change is logged", async () => {
    const admin = stored(testUser("admin", { isAdmin: true }));

    await controller.createAccount(
      {
        username: "bob",
        password: "secret123",
        roles: ["builtin:viewer"],
        grants: { [FILES]: "write" },
        extPermissions: ["ext.map"],
      },
      admin,
      request(),
    );

    const bob = users.findByUsername("bob")!;
    expect(bob.roles).toEqual(["builtin:viewer"]);
    expect(bob.access.levels[FILES]).toBe("write");
    expect(bob.access.levels[CONSOLE]).toBe("read");
    const [entry] = accessEntries();
    expect(entry.category).toBe(AuditCategory.ROLES);
    expect(entry.resourceName).toBe("bob");
    expect(entry.username).toBe("admin");
    expect(entry.details).toEqual({
      rolesAdded: ["Viewer"],
      rolesRemoved: [],
      extAdded: ["ext.map"],
      extRemoved: [],
    });
    expect(entry.changes).toContainEqual({
      field: "grants.files",
      from: null,
      to: "write",
    });
  });

  test("a manager can't create an account above its own access", async () => {
    const manager = stored(
      userWith({ [ACCOUNTS]: "write", [CONSOLE]: "read" }, { id: "m" }),
    );

    const err = await rejected(
      controller.createAccount(
        {
          username: "bob",
          password: "secret123",
          roles: ["builtin:moderator"],
        },
        manager,
        request(),
      ),
    );

    expect(err).toBeInstanceOf(ForbiddenException);
    expect(users.findByUsername("bob")).toBeNull();
  });

  test("an unknown role is refused before anything is stored", async () => {
    const admin = stored(testUser("admin", { isAdmin: true }));

    const err = await rejected(
      controller.createAccount(
        { username: "bob", password: "secret123", roles: ["nope"] },
        admin,
        request(),
      ),
    );

    expect((err as { status: number }).status).toBe(400);
    expect(users.findByUsername("bob")).toBeNull();
  });

  test("taking a role away is logged with what was taken", async () => {
    const admin = stored(testUser("admin", { isAdmin: true }));
    stored(testUser("bob", { roles: ["builtin:viewer", "builtin:moderator"] }));

    await controller.updateAccount(
      "bob",
      { roles: ["builtin:viewer"] },
      admin,
      undefined,
      request(),
    );

    expect(users.findByUsername("bob")!.roles).toEqual(["builtin:viewer"]);
    expect(accessEntries()[0].details).toEqual({
      rolesAdded: [],
      rolesRemoved: ["Moderator"],
      extAdded: [],
      extRemoved: [],
    });
  });

  test("an update that leaves access alone logs no access change", async () => {
    const admin = stored(testUser("admin", { isAdmin: true }));
    stored(testUser("bob", { roles: ["builtin:viewer"] }));

    await controller.updateAccount(
      "bob",
      { username: "robert" },
      admin,
      undefined,
      request(),
    );

    expect(accessEntries()).toHaveLength(0);
  });

  test("a manager can't edit an account holding more than it has", async () => {
    const manager = stored(
      userWith({ [ACCOUNTS]: "write", [CONSOLE]: "read" }, { id: "m" }),
    );
    stored(userWith({ [POWER]: "manage" }, { id: "bob" }));

    const err = await rejected(
      controller.updateAccount(
        "bob",
        { grants: {} },
        manager,
        undefined,
        request(),
      ),
    );

    expect(err).toBeInstanceOf(ForbiddenException);
    expect(users.findByUsername("bob")!.grants).toEqual({ [POWER]: "manage" });
  });

  test("a manager can't delete an account holding more than it has", () => {
    const manager = stored(
      userWith({ [ACCOUNTS]: "write", [CONSOLE]: "read" }, { id: "m" }),
    );
    stored(userWith({ [FILES]: "read" }, { id: "bob" }));

    expect(
      caught(() => controller.deleteAccount("bob", manager, request())),
    ).toBeInstanceOf(ForbiddenException);
    expect(users.findByUsername("bob")).not.toBeNull();
  });

  test("a manager gives a role within its access", async () => {
    const manager = stored(
      userWith(
        {
          [ACCOUNTS]: "write",
          [CONSOLE]: "write",
          [POWER]: "write",
          [AccessArea.PLAYERS]: "manage",
          [AccessArea.SETTINGS]: "read",
          [AccessArea.CONTENT]: "read",
          [AccessArea.BACKUPS]: "read",
          [AccessArea.SCHEDULER]: "read",
          [AccessArea.NETWORKS]: "read",
        },
        { id: "m" },
      ),
    );
    stored(testUser("bob"));

    await controller.updateAccount(
      "bob",
      { roles: ["builtin:moderator"] },
      manager,
      undefined,
      request(),
    );

    expect(users.findByUsername("bob")!.access.levels[POWER]).toBe("write");
  });
});

describe("AccountsController socket events", () => {
  function heard(event: "user.access_changed" | "user.deleted") {
    const ids: string[] = [];
    events.on(event, ({ userId }) => void ids.push(userId));
    return ids;
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  test("an access change is announced, a rename is not", async () => {
    const admin = stored(testUser("admin", { isAdmin: true }));
    const bob = stored(testUser("bob", { roles: ["builtin:viewer"] }));
    const changed = heard("user.access_changed");

    await controller.updateAccount(
      "bob",
      { username: "robert" },
      admin,
      undefined,
      request(),
    );
    await settle();
    expect(changed).toEqual([]);

    await controller.updateAccount(
      "robert",
      { roles: [] },
      admin,
      undefined,
      request(),
    );
    await settle();
    expect(changed).toEqual([bob.id]);
  });

  test("a deleted account is announced", async () => {
    const admin = stored(testUser("admin", { isAdmin: true }));
    const bob = stored(testUser("bob"));
    const deleted = heard("user.deleted");

    controller.deleteAccount("bob", admin, request());
    await settle();

    expect(deleted).toEqual([bob.id]);
  });
});
