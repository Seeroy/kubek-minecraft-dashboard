import { describe, expect, it } from "bun:test";
import { fake } from "@/testing/fake";
import { testUser, userWith } from "@/testing/user";
import type { AccountsService } from "@/modules/accounts/accounts.service";
import { AccessArea } from "@shared/access/areas";
import { NotificationAudienceService } from "./notification-audience.service";

const users = [
  userWith({ [AccessArea.POWER]: "read" }, { id: "viewer" }),
  userWith(
    { [AccessArea.POWER]: "read" },
    { id: "other", serversRestrict: { enabled: true, allowed: ["b"] } },
  ),
  userWith({ [AccessArea.STORAGES]: "manage" }, { id: "storages" }),
  testUser("admin", { isAdmin: true }),
  testUser("nobody"),
];

const service = new NotificationAudienceService(
  fake<AccountsService>({
    findAll: () => users,
    findById: (id: string) => users.find((user) => user.id === id) ?? null,
  }),
);

const ids = (list: { id: string }[]) => list.map((user) => user.id);

describe("NotificationAudienceService", () => {
  it("sends a server event to users with the level on that server", () => {
    expect(
      ids(
        service.resolve({
          serverId: "a",
          area: AccessArea.POWER,
          level: "read",
        }),
      ),
    ).toEqual(["viewer", "admin"]);
  });

  it("sends a panel event to users with the level in the area", () => {
    expect(
      ids(service.resolve({ area: AccessArea.STORAGES, level: "manage" })),
    ).toEqual(["storages", "admin"]);
  });

  it("sends a personal event to that user only", () => {
    expect(ids(service.resolve({ userId: "nobody" }))).toEqual(["nobody"]);
  });
});
