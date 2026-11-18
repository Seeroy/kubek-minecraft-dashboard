import { seesAllServers } from "@/core/utils/serverAccess";
import {
  AccessArea,
  type AccessLevel,
  type AccessMap,
  isAccessArea,
  isAreaLevel,
  levelAtLeast,
} from "@shared/access/areas";
import type { IApiKey } from "@shared/types/api-key.types";
import type { IUser, UserServersRestrict } from "@shared/types/user.types";

type Owner = Pick<IUser, "isAdmin" | "access" | "serversRestrict">;

// Keys can't make keys or read the owner's assistant chats
export const KEY_FORBIDDEN_AREAS: readonly AccessArea[] = [
  AccessArea.API,
  AccessArea.ASSISTANT,
];

/** The owner as the key sees it: lower of both levels, shared servers, no admin */
export function narrowToKey(owner: IUser, key: IApiKey): IUser {
  return {
    ...owner,
    isAdmin: false,
    access: { levels: keyLevels(owner, key.grants), ext: [] },
    serversRestrict: keyServers(owner, key.servers),
    apiKey: { id: key.id, name: key.name, mcp: key.mcp },
  };
}

function keyLevels(owner: Owner, grants: AccessMap): AccessMap {
  const levels: AccessMap = {};
  for (const [area, level] of Object.entries(grants) as [
    AccessArea,
    AccessLevel,
  ][]) {
    if (KEY_FORBIDDEN_AREAS.includes(area)) continue;
    const own = owner.isAdmin ? level : owner.access.levels[area];
    const effective = levelAtLeast(own, level) ? level : own;
    if (effective) levels[area] = effective;
  }
  return levels;
}

function keyServers(
  owner: Owner,
  servers: string[] | null,
): UserServersRestrict {
  const ownerAll = seesAllServers(owner);
  if (!servers) {
    return ownerAll
      ? { enabled: false, allowed: [] }
      : { enabled: true, allowed: [...owner.serversRestrict.allowed] };
  }
  const allowed = ownerAll
    ? servers
    : servers.filter((id) => owner.serversRestrict.allowed.includes(id));
  return { enabled: true, allowed };
}

/** Reason the levels can't go on a key, null when they can */
export function keyGrantsVerdict(
  owner: Owner,
  grants: Record<string, string>,
): string | null {
  const above: string[] = [];
  for (const [area, level] of Object.entries(grants)) {
    if (!isAccessArea(area) || !isAreaLevel(area, level)) {
      return `Unknown level ${area} ${level}`;
    }
    if (KEY_FORBIDDEN_AREAS.includes(area)) {
      return `A key can't get ${area} access`;
    }
    if (!owner.isAdmin && !levelAtLeast(owner.access.levels[area], level)) {
      above.push(`${area} ${level}`);
    }
  }
  return above.length
    ? `Key gives access above yours: ${above.join(", ")}`
    : null;
}

/** Reason the server list can't go on a key, null when it can */
export function keyServersVerdict(
  owner: Owner,
  servers: string[] | null,
  exists: (id: string) => boolean,
): string | null {
  if (!servers) return null;
  const unknown = servers.filter((id) => !exists(id));
  if (unknown.length) return `Unknown servers: ${unknown.join(", ")}`;
  if (seesAllServers(owner)) return null;
  const foreign = servers.filter(
    (id) => !owner.serversRestrict.allowed.includes(id),
  );
  return foreign.length
    ? `Key reaches servers you can't: ${foreign.join(", ")}`
    : null;
}
