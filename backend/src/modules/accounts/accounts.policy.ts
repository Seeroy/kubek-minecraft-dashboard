import { ApiErrorCode } from "@/core/errors/error-codes";
import { seesAllServers } from "@/core/utils/serverAccess";
import { ForbiddenException } from "@nestjs/common";
import {
  AccessArea,
  type AccessLevel,
  type AccessMap,
  levelAtLeast,
  mergeAccess,
} from "@shared/access/areas";
import { can, type UserAccess } from "@shared/access/can";
import type { IRole } from "@shared/access/roles";
import type { IUser, UserServersRestrict } from "@shared/types/user.types";

type Actor = Pick<IUser, "id" | "isAdmin" | "access" | "serversRestrict">;
type RoleAccess = Pick<IRole, "grants" | "ext">;

/** What an account ends up with after a create or update */
export interface AccessPlan {
  roles: Pick<IRole, "name" | "grants" | "ext">[];
  grants: AccessMap;
  extPermissions: string[];
  serversRestrict: UserServersRestrict;
}

/** Reason it's not allowed, null if it is */
export type PolicyVerdict = string | null;

export function enforcePolicy(verdict: PolicyVerdict): void {
  if (verdict) {
    throw new ForbiddenException({
      code: ApiErrorCode.ACCESS_ESCALATION,
      message: verdict,
    });
  }
}

/** Same merge the users repository does on read */
export function effectiveAccess(
  roles: RoleAccess[],
  grants: AccessMap,
  extPermissions: string[],
): UserAccess {
  return {
    levels: mergeAccess(...roles.map((role) => role.grants), grants),
    ext: [
      ...new Set([...roles.flatMap((role) => role.ext), ...extPermissions]),
    ],
  };
}

/** Levels and keys of access the actor doesn't have itself */
export function accessAbove(actor: Actor, access: UserAccess): string[] {
  if (actor.isAdmin) return [];
  const levels = (Object.entries(access.levels) as [AccessArea, AccessLevel][])
    .filter(([area, level]) => !levelAtLeast(actor.access.levels[area], level))
    .map(([area, level]) => `${area} ${level}`);
  const keys = access.ext.filter((key) => !actor.access.ext.includes(key));
  return [...levels, ...keys];
}

/** Roles are created, edited and given only within the actor's own access */
export function canUseRole(actor: Actor, role: RoleAccess): PolicyVerdict {
  const above = accessAbove(actor, { levels: role.grants, ext: role.ext });
  return above.length
    ? `Role gives access above yours: ${above.join(", ")}`
    : null;
}

type Target = Pick<IUser, "isAdmin" | "access" | "serversRestrict">;

/** Admins only by admins, others only within your access and servers */
export function canManageAccount(actor: Actor, target: Target): PolicyVerdict {
  if (target.isAdmin && !actor.isAdmin) {
    return "Only admins can manage admin accounts";
  }
  const above = accessAbove(actor, target.access);
  if (above.length) {
    return `Account has access above yours: ${above.join(", ")}`;
  }
  return canReachServers(actor, target);
}

// Taking over an account gives its levels on every server it sees
export function canReachServers(
  actor: Actor,
  target: Pick<IUser, "isAdmin" | "serversRestrict">,
): PolicyVerdict {
  if (seesAllServers(actor)) return null;
  if (seesAllServers(target)) return "Account can access all servers";
  const mine = new Set(actor.serversRestrict.allowed ?? []);
  const foreign = (target.serversRestrict.allowed ?? []).filter(
    (id) => !mine.has(id),
  );
  return foreign.length
    ? `Account can access servers you can't: ${foreign.join(", ")}`
    : null;
}

/** Roles are global, a restricted actor can't change one used outside its servers */
export function canChangeRoleMembers(
  actor: Actor,
  members: Pick<IUser, "username" | "isAdmin" | "serversRestrict">[],
): PolicyVerdict {
  const outside = members.filter((m) => canReachServers(actor, m) !== null);
  return outside.length
    ? `Role has members outside your servers: ${outside.map((m) => m.username).join(", ")}`
    : null;
}

/** Reset or remove someone else's FTP password */
export function canManageFtpPassword(
  actor: Actor,
  target: Target & Pick<IUser, "id">,
): PolicyVerdict {
  if (actor.id === target.id) return null;
  if (!can(actor, AccessArea.ACCOUNTS, "write")) {
    return "Account management permission required";
  }
  return canManageAccount(actor, target);
}

/** Non-admins can only give access and servers they have themselves */
export function canGrant(actor: Actor, next: AccessPlan): PolicyVerdict {
  if (actor.isAdmin) return null;

  for (const role of next.roles) {
    const above = accessAbove(actor, { levels: role.grants, ext: role.ext });
    if (above.length) {
      return `Can't assign role "${role.name}" above your access: ${above.join(", ")}`;
    }
  }
  const above = accessAbove(
    actor,
    effectiveAccess(next.roles, next.grants, next.extPermissions),
  );
  if (above.length) {
    return `Can't give access you don't have: ${above.join(", ")}`;
  }

  if (seesAllServers(actor)) return null;
  return serversWithin(actor.serversRestrict, next.serversRestrict);
}

// Restricted users can't give access to servers they can't see
function serversWithin(
  own: UserServersRestrict,
  restrict: UserServersRestrict,
): PolicyVerdict {
  // Restriction off means all servers
  if (!restrict?.enabled) return "Can't give access to all servers";
  const mine = new Set(own.allowed ?? []);
  const foreign = restrict.allowed.filter((id) => !mine.has(id));
  if (foreign.length > 0) {
    return `Can't give access to servers you can't access: ${foreign.join(", ")}`;
  }
  return null;
}

function sameRestrict(
  a: UserServersRestrict,
  b: UserServersRestrict | undefined,
): boolean {
  if (!b) return false;
  return (
    a.enabled === b.enabled &&
    a.allowed.length === b.allowed.length &&
    a.allowed.every((id) => b.allowed.includes(id))
  );
}

/** Password or access changed, old sessions have to go */
export function needsSessionRevoke(before: IUser, after: IUser): boolean {
  return before.password !== after.password || accessChanged(before, after);
}

/** Admin flag, roles, levels or servers changed */
export function accessChanged(before: IUser, after: IUser): boolean {
  return (
    !!before.isAdmin !== !!after.isAdmin ||
    !sameSet(before.roles, after.roles) ||
    !sameGrants(before.grants, after.grants) ||
    !sameSet(before.extPermissions, after.extPermissions) ||
    !sameRestrict(before.serversRestrict, after.serversRestrict)
  );
}

function sameSet<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

function sameGrants(a: AccessMap, b: AccessMap): boolean {
  const areas = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...areas].every(
    (area) => a[area as AccessArea] === b[area as AccessArea],
  );
}
