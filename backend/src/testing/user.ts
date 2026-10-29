import type { AccessMap } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";

/** Account with no access, personal grants also become its effective levels */
export function testUser(id: string, extra: Partial<IUser> = {}): IUser {
  const grants = extra.grants ?? {};
  const extPermissions = extra.extPermissions ?? [];
  return {
    id,
    username: id,
    password: "hash",
    roles: [],
    grants,
    extPermissions,
    access: { levels: grants, ext: extPermissions },
    serversRestrict: { enabled: false, allowed: [] },
    ...extra,
  };
}

export function userWith(levels: AccessMap, extra: Partial<IUser> = {}) {
  return testUser(extra.id ?? "u", { grants: levels, ...extra });
}
