import { AccessArea, type AccessMap, accessWithin, mergeAccess } from "./areas";

/** Flat permissions from before 4.2, kept for Kubek 3 imports and extensions */
export const LEGACY_PERMISSION_ACCESS: Record<string, AccessMap> = {
  servers_view: {
    [AccessArea.CONSOLE]: "read",
    [AccessArea.POWER]: "read",
    [AccessArea.PLAYERS]: "read",
    [AccessArea.NETWORKS]: "read",
  },
  servers_control: {
    [AccessArea.CONSOLE]: "write",
    [AccessArea.POWER]: "manage",
    [AccessArea.PLAYERS]: "write",
  },
  servers_configure: {
    [AccessArea.SETTINGS]: "manage",
    [AccessArea.PLAYERS]: "manage",
    [AccessArea.NETWORKS]: "manage",
    [AccessArea.SERVERS]: "manage",
  },
  servers_create: { [AccessArea.SERVERS]: "write" },
  file_manager: { [AccessArea.FILES]: "manage" },
  plugins_mgr: { [AccessArea.CONTENT]: "manage" },
  backups: { [AccessArea.BACKUPS]: "manage", [AccessArea.STORAGES]: "read" },
  scheduler_mgr: { [AccessArea.SCHEDULER]: "manage" },
  java_mgr: { [AccessArea.JAVA]: "manage" },
  system_monitoring: { [AccessArea.MONITORING]: "read" },
  audit_log: { [AccessArea.AUDIT]: "read" },
  ai_assistant: { [AccessArea.ASSISTANT]: "read" },
  accounts_mgr: { [AccessArea.ACCOUNTS]: "write" },
  kubek_settings: {
    [AccessArea.PANEL]: "manage",
    [AccessArea.INTEGRATIONS]: "manage",
    [AccessArea.STORAGES]: "manage",
    [AccessArea.AUDIT]: "manage",
    [AccessArea.ASSISTANT]: "manage",
  },
};

export function isLegacyPermission(key: string): boolean {
  return key in LEGACY_PERMISSION_ACCESS;
}

export function accessFromLegacy(keys: readonly string[]): AccessMap {
  return mergeAccess(...keys.map((key) => LEGACY_PERMISSION_ACCESS[key] ?? {}));
}

/** Old keys fully covered by the levels, extensions still check them */
export function legacyFromAccess(levels: AccessMap): string[] {
  return Object.entries(LEGACY_PERMISSION_ACCESS)
    .filter(([, needed]) => accessWithin(needed, levels))
    .map(([key]) => key);
}
