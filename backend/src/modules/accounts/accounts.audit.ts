import { diffChanges } from "@/modules/audit-log/audit-diff";
import type { AuditChange } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";

type NameOf = (id: string) => string;

// Server access is logged by name, the password hash only as changed
const accountOf = (user: IUser, server: NameOf) => ({
  username: user.username,
  isAdmin: !!user.isAdmin,
  serversRestrict: {
    enabled: !!user.serversRestrict?.enabled,
    allowed: (user.serversRestrict?.allowed ?? []).map(server),
  },
  password: user.password,
});

// Roles are logged by name so the entry outlives a rename
const accessOf = (user: IUser | null, role: NameOf) => ({
  roles: (user?.roles ?? []).map(role).sort(),
  grants: { ...user?.grants },
  extPermissions: [...(user?.extPermissions ?? [])].sort(),
});

export function accountChanges(
  before: IUser,
  after: IUser,
  server: NameOf,
): AuditChange[] {
  return diffChanges(accountOf(before, server), accountOf(after, server), {
    secrets: ["password"],
  });
}

/** What a new account was given, without the password */
export function accountGrants(user: IUser, server: NameOf) {
  const { isAdmin, serversRestrict } = accountOf(user, server);
  return { isAdmin, serversRestrict };
}

export interface AccessChange {
  changes: AuditChange[];
  details: {
    rolesAdded: string[];
    rolesRemoved: string[];
    extAdded: string[];
    extRemoved: string[];
  };
}

/** Roles, personal levels and keys given or taken, null when nothing moved */
export function accessChange(
  before: IUser | null,
  after: IUser,
  role: NameOf,
): AccessChange | null {
  const from = accessOf(before, role);
  const to = accessOf(after, role);
  const changes = diffChanges(from, to);
  if (!changes.length) return null;
  const added = (a: string[], b: string[]) => b.filter((x) => !a.includes(x));
  return {
    changes,
    details: {
      rolesAdded: added(from.roles, to.roles),
      rolesRemoved: added(to.roles, from.roles),
      extAdded: added(from.extPermissions, to.extPermissions),
      extRemoved: added(to.extPermissions, from.extPermissions),
    },
  };
}
