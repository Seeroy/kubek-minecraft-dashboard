import type { IConfiguration } from "@/core/types/config";
import type { AccessMap } from "@shared/access/areas";
import { accessFromLegacy } from "@shared/access/legacy";
import {
  ServerStatus,
  type IServer,
  type ServerCoreType,
} from "@shared/types/server/server.types";
import type { IUser } from "@shared/types/user.types";
import { CORE_TYPES } from "./legacy-core-types";
import type { LegacyConfig, LegacyServer, LegacyUser } from "./legacy.types";

// Kubek 3 permission -> pre 4.2 flat keys. Unmapped ones are dropped
const PERMISSION_MAP: Record<string, string[]> = {
  accounts: ["accounts_mgr"],
  file_manager: ["file_manager"],
  manage_servers: ["servers_control", "servers_configure"],
  making_servers: ["servers_create"],
  monitor_servers: ["servers_view"],
  manage_java: ["java_mgr"],
  manage_plugins: ["plugins_mgr"],
  system_monitoring: ["system_monitoring"],
  kubek_settings: ["kubek_settings"],
};

// Keys with no Kubek 3 equivalent, granted to admins only
const ADMIN_ONLY_PERMISSIONS = ["backups", "scheduler_mgr", "audit_log"];

// Admin = could manage both accounts and settings in the old panel
export function mapPermissions(legacy: string[] = []): {
  grants: AccessMap;
  isAdmin: boolean;
} {
  const keys = legacy.flatMap((perm) => PERMISSION_MAP[perm] ?? []);
  const isAdmin =
    legacy.includes("accounts") && legacy.includes("kubek_settings");
  if (isAdmin) keys.push(...ADMIN_ONLY_PERMISSIONS);
  return { grants: accessFromLegacy(keys), isAdmin };
}

export function mapConfig(legacy: LegacyConfig): Partial<IConfiguration> {
  return {
    eulaAccepted: !!legacy.eulaAccepted,
    authorization: !!legacy.authorization,
    port:
      typeof legacy.webserverPort === "number" ? legacy.webserverPort : 8000,
    ftpd: {
      // No global FTP login anymore, accounts have their own password
      enabled: !!legacy.ftpd?.enabled,
      port: legacy.ftpd?.port,
    },
    subnetsAccessRestriction: {
      enabled: !!legacy.allowOnlyIPsList,
      subnets: legacy.IPsAllowed ?? [],
    },
    telegramBot: {
      enabled: !!legacy.telegramBot?.enabled,
      token: legacy.telegramBot?.token,
      chatIds: (legacy.telegramBot?.chatIds ?? []).map(String),
    },
  };
}

// The legacy version not stored the core, so ill try guess it from jar name
function inferCoreType(binaryName: string): ServerCoreType {
  const name = binaryName.toLowerCase();
  for (const core of Object.values(CORE_TYPES)) {
    if (name.includes(core)) return core;
  }
  return "custom";
}

// Map a legacy server onto a bundled blueprint id
function inferBlueprintId(
  isBedrock: boolean,
  coreType: ServerCoreType,
): string {
  if (isBedrock) return "com.kubek.bedrock";
  // no BeamMP blueprint, run whatever jar is there as custom
  if (coreType === "custom" || coreType === "beammp") return "com.kubek.custom";
  return `com.kubek.${coreType}`;
}

// 3.x saved downloaded cores as <core>-<version>.jar
export function parseLegacyJarVersion(binaryName: string): string | undefined {
  return /-(\d+\.\d+(?:\.\d+)?)\.jar$/i.exec(binaryName)?.[1];
}

// Offline on purpose, migration runs at boot and can't wait on Mojang
export function javaForMinecraft(version: string): number | undefined {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(version);
  if (!match) return undefined;
  const [major, minor, patch] = match.slice(1).map((n) => Number(n ?? 0));
  if (major >= 26) return 25;
  if (major !== 1) return undefined;
  if (minor <= 16) return 8;
  if (minor === 17) return 16;
  if (minor < 20 || (minor === 20 && patch < 5)) return 17;
  return 21;
}

// Proxy versions aren't game versions
const PROXY_CORES: ServerCoreType[] = ["velocity", "waterfall"];

function parseXmx(args: string[]): number | undefined {
  for (const arg of args) {
    const match = /-Xmx(\d+)([mMgG]?)/.exec(arg);
    if (match) {
      const value = parseInt(match[1], 10);
      return match[2]?.toLowerCase() === "g" ? value * 1024 : value;
    }
  }
  return undefined;
}

// binaryName is the jar found on disk, empty for Bedrock or when none exists,
// scriptJava is the managed Java major the old start script used
export function mapServer(
  legacy: LegacyServer,
  name: string,
  binaryName: string,
  startupArguments: string[],
  scriptJava?: number,
): Omit<IServer, "id"> {
  const isBedrock = legacy.minecraftType === "bedrock";
  const coreType: ServerCoreType = isBedrock
    ? "custom"
    : inferCoreType(binaryName);
  const blueprintId = inferBlueprintId(isBedrock, coreType);

  const variables: IServer["variables"] = {
    XMX: parseXmx(startupArguments) ?? 2048,
  };
  const gameVersion = isBedrock ? undefined : parseLegacyJarVersion(binaryName);
  if (gameVersion && blueprintId !== "com.kubek.custom") {
    variables.GAME_VERSION = gameVersion;
  }
  if (!isBedrock) {
    const isProxy = PROXY_CORES.includes(coreType);
    const java =
      scriptJava ??
      (gameVersion && !isProxy ? javaForMinecraft(gameVersion) : undefined);
    if (java) variables.JAVA_VERSION = java;
  }

  return {
    name,
    status: ServerStatus.STOPPED,
    restartOnError: {
      enabled: !!legacy.restartOnError,
      attempts:
        typeof legacy.maxRestartAttempts === "number"
          ? legacy.maxRestartAttempts
          : 3,
    },
    folderId: null,
    // blueprint assignment for servers imported from old Kubek versions
    blueprintId,
    blueprintVersion: "1.0.0",
    runtimeKind: "native",
    variables,
    // 3.x never recorded who made a server
    createdBy: null,
  };
}

// hashedPassword is NEW, generated by the caller
// serverNameToId remaps the old serversAllowed names to the new UUIDs
export function mapUser(
  legacy: LegacyUser,
  username: string,
  id: string,
  hashedPassword: string,
  serverNameToId: Map<string, string>,
): IUser {
  const { grants, isAdmin } = mapPermissions(legacy.permissions ?? []);
  const allowed = (legacy.serversAllowed ?? [])
    .map((name) => serverNameToId.get(name))
    .filter((mappedId): mappedId is string => !!mappedId);

  return {
    id,
    username,
    password: hashedPassword,
    roles: [],
    grants,
    extPermissions: [],
    // The repository computes the real effective access on read
    access: { levels: grants, ext: [] },
    serversRestrict: {
      enabled: !!legacy.serversAccessRestricted,
      allowed,
    },
    isAdmin,
  };
}
