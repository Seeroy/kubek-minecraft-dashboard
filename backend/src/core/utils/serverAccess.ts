import type { IUser } from "@shared/types/user.types";
import { type AccessSubject, canSeeServer } from "@shared/access/can";

type AccessUser = Pick<IUser, "isAdmin" | "serversRestrict">;

// Admins and users without a server list see every server
export function seesAllServers(user: AccessUser | null | undefined): boolean {
  return !!user && (!!user.isAdmin || !user.serversRestrict?.enabled);
}

export function canAccessServer(
  user: AccessUser | null | undefined,
  serverId: string,
): boolean {
  if (!user) return false;
  if (seesAllServers(user)) return true;
  return (user.serversRestrict.allowed ?? []).includes(serverId);
}

export function accessibleServers<T extends { id: string }>(
  user: AccessUser | null | undefined,
  servers: T[],
): T[] {
  return servers.filter((server) => canAccessServer(user, server.id));
}

// Server lists also need read in some server area
export function visibleServers<T extends { id: string }>(
  user: AccessSubject | null | undefined,
  servers: T[],
): T[] {
  return servers.filter((server) => canSeeServer(user, server.id));
}
