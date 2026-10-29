import { AccessArea, type AccessMap } from "./areas";

export interface IRole {
  id: string;
  name: string;
  description: string | null;
  /** Set for roles shipped with the panel, they can't be renamed or deleted */
  builtinKey: string | null;
  grants: AccessMap;
  /** Extension permission keys */
  ext: string[];
  createdAt: number;
  updatedAt: number;
}

const VIEWER: AccessMap = {
  [AccessArea.CONSOLE]: "read",
  [AccessArea.POWER]: "read",
  [AccessArea.SETTINGS]: "read",
  [AccessArea.CONTENT]: "read",
  [AccessArea.PLAYERS]: "read",
  [AccessArea.BACKUPS]: "read",
  [AccessArea.SCHEDULER]: "read",
  [AccessArea.NETWORKS]: "read",
};

const MODERATOR: AccessMap = {
  ...VIEWER,
  [AccessArea.CONSOLE]: "write",
  [AccessArea.POWER]: "write",
  [AccessArea.PLAYERS]: "manage",
};

const OPERATOR: AccessMap = {
  ...MODERATOR,
  [AccessArea.SETTINGS]: "write",
  [AccessArea.FILES]: "write",
  [AccessArea.CONTENT]: "write",
  [AccessArea.BACKUPS]: "write",
  [AccessArea.SCHEDULER]: "write",
};

const SERVER_ADMIN: AccessMap = {
  [AccessArea.CONSOLE]: "write",
  [AccessArea.POWER]: "manage",
  [AccessArea.SETTINGS]: "manage",
  [AccessArea.FILES]: "manage",
  [AccessArea.CONTENT]: "manage",
  [AccessArea.PLAYERS]: "manage",
  [AccessArea.BACKUPS]: "manage",
  [AccessArea.SCHEDULER]: "manage",
  [AccessArea.SERVERS]: "manage",
  [AccessArea.NETWORKS]: "manage",
  [AccessArea.JAVA]: "write",
};

/** Seeded by migration 019 with ids builtin:<key> */
export const BUILTIN_ROLES: readonly {
  key: string;
  name: string;
  grants: AccessMap;
}[] = [
  { key: "viewer", name: "Viewer", grants: VIEWER },
  { key: "moderator", name: "Moderator", grants: MODERATOR },
  { key: "operator", name: "Operator", grants: OPERATOR },
  { key: "server-admin", name: "Server admin", grants: SERVER_ADMIN },
];
