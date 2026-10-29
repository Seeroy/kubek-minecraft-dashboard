import { describe, expect, it } from "bun:test";
import { testUser, userWith } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import { LEGACY_PERMISSION_ACCESS } from "@shared/access/legacy";
import { extPermissionsOf } from "./ext-user";

describe("extPermissionsOf", () => {
  it("gives old keys fully covered by the levels plus extension keys", () => {
    const user = userWith(
      { [AccessArea.FILES]: "manage", [AccessArea.CONTENT]: "write" },
      { extPermissions: ["com.acme.view"] },
    );
    expect(extPermissionsOf(user)).toEqual(["file_manager", "com.acme.view"]);
  });

  it("gives an admin every old key", () => {
    const admin = testUser("a", { isAdmin: true });
    expect(extPermissionsOf(admin)).toEqual(
      Object.keys(LEGACY_PERMISSION_ACCESS),
    );
  });
});
