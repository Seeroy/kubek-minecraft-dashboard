import type { ModrinthVersion } from "@shared/types/plugins";

/** Initial version if it exists, else the newest one built for the server's MC version, else the newest */
export function pickVersion(versions: ModrinthVersion[], initial: string | undefined, gameVersion: string | undefined) {
  if (initial && versions.some((v) => v.id === initial)) return initial;
  return (versions.find((v) => gameVersion && v.game_versions.includes(gameVersion)) ?? versions[0])?.id;
}

export function isHitCompatible(versions: string[], gameVersion: string | undefined) {
  return !gameVersion || versions.includes(gameVersion);
}
