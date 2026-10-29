import { useAuthStore } from "@/shared/stores/auth-store";
import { type AccessArea, type AccessLevel, SERVER_AREAS } from "@shared/access/areas";
import { type AccessSubject, can, canOnServer, canSeeServer, seesServers } from "@shared/access/can";

// An area at a level, "serverView" for read in any server area, or any one of several
export type AccessRequirement = readonly [AccessArea, AccessLevel] | "serverView" | { readonly anyOf: readonly AccessRequirement[] };

// Server areas are checked on the given server when there is one, without it only the level counts
export function meetsAccess(user: AccessSubject | null | undefined, access: AccessRequirement | null | undefined, serverId?: string | null): boolean {
  if (!access) return true;
  if (access === "serverView") return serverId ? canSeeServer(user, serverId) : seesServers(user);
  if ("anyOf" in access) return access.anyOf.some((one) => meetsAccess(user, one, serverId));
  const [area, level] = access;
  return serverId && SERVER_AREAS.includes(area) ? canOnServer(user, area, level, serverId) : can(user, area, level);
}

export function useAccess(access: AccessRequirement | null | undefined, serverId?: string | null): boolean {
  return useAuthStore((s) => meetsAccess(s.user, access, serverId));
}
