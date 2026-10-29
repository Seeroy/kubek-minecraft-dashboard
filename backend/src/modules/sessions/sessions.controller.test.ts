import { beforeEach, describe, expect, test } from "bun:test";
import { testUser } from "@/testing/user";
import { NotFoundException } from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { AppEventsService } from "@/core/events/app-events.service";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";

let service: SessionsService;
let controller: SessionsController;
let alice: IUser;

beforeEach(() => {
  const sqlite = sqliteProvider();
  const users = new UsersRepository(sqlite);
  for (const id of ["alice", "bob"]) {
    users.create(testUser(id));
  }
  alice = users.findById("alice")!;
  service = new SessionsService(
    new UserSessionsRepository(sqlite),
    new AccountsService(users),
    new ExtensionEventBus(new ServersRepository(sqlite)),
    new AppEventsService(),
  );
  controller = new SessionsController(service);
});

describe("SessionsController", () => {
  test("a user cannot revoke someone else's session", () => {
    const bobs = service.create("bob", null, null);

    expect(() =>
      controller.revoke(alice, bobs.session.id, fake<Request>({})),
    ).toThrow(NotFoundException);
    expect(service.authenticate(bobs.token).user.id).toBe("bob");
  });

  test("a user can revoke one of their own sessions", () => {
    const current = service.create("alice", null, null);
    const laptop = service.create("alice", "10.0.0.7", "laptop");

    controller.revoke(alice, laptop.session.id, fake<Request>({}));

    expect(service.findByToken(laptop.token)).toBeNull();
    expect(service.authenticate(current.token).user.id).toBe("alice");
  });

  test("revoking an already revoked session is a 404", () => {
    const laptop = service.create("alice", null, null);
    controller.revoke(alice, laptop.session.id, fake<Request>({}));

    expect(() =>
      controller.revoke(alice, laptop.session.id, fake<Request>({})),
    ).toThrow(NotFoundException);
  });

  test("revoke all keeps the session making the request", () => {
    const current = service.create("alice", null, null);
    const other = service.create("alice", null, null);

    controller.revokeAll(alice, current.session);

    expect(controller.list(alice, current.session)).toEqual([
      expect.objectContaining({ id: current.session.id, current: true }),
    ]);
    expect(service.findByToken(other.token)).toBeNull();
  });

  test("list without a current session marks nothing as current", () => {
    service.create("alice", null, null);

    expect(controller.list(alice, undefined).map((s) => s.current)).toEqual([
      false,
    ]);
  });
});
