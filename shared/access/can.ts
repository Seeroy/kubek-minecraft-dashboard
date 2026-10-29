import {
  type AccessArea,
  type AccessLevel,
  type AccessMap,
  levelAtLeast,
  SERVER_AREAS,
} from "./areas";

export interface UserAccess {
  /** Highest level per area from roles and personal levels */
  levels: AccessMap;
  /** Extension permission keys from roles and personal ones */
  ext: string[];
}

export interface AccessSubject {
  isAdmin?: boolean;
  access: UserAccess;
  serversRestrict?: { enabled: boolean; allowed: string[] };
}

export function can(
  user: AccessSubject | null | undefined,
  area: AccessArea,
  level: AccessLevel,
): boolean {
  if (!user) return false;
  return !!user.isAdmin || levelAtLeast(user.access.levels[area], level);
}

// Admins and accounts without a server list reach every server
export function reachesServer(
  user: AccessSubject | null | undefined,
  serverId: string,
): boolean {
  if (!user) return false;
  if (user.isAdmin || !user.serversRestrict?.enabled) return true;
  return user.serversRestrict.allowed.includes(serverId);
}

export function canOnServer(
  user: AccessSubject | null | undefined,
  area: AccessArea,
  level: AccessLevel,
  serverId: string,
): boolean {
  return can(user, area, level) && reachesServer(user, serverId);
}

/** Any server area at read is enough to see a server in lists */
export function seesServers(user: AccessSubject | null | undefined): boolean {
  return SERVER_AREAS.some((area) => can(user, area, "read"));
}

export function canSeeServer(
  user: AccessSubject | null | undefined,
  serverId: string,
): boolean {
  return seesServers(user) && reachesServer(user, serverId);
}

export function hasExtPermission(
  user: AccessSubject | null | undefined,
  key: string,
): boolean {
  if (!user) return false;
  return !!user.isAdmin || user.access.ext.includes(key);
}
