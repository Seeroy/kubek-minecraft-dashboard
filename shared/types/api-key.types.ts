import type { AccessMap } from "../access/areas";

/** Stored key, the secret itself is never kept */
export interface IApiKey {
  id: string;
  userId: string;
  name: string;
  /** First characters of the token, shown so keys can be told apart */
  prefix: string;
  tokenHash: string;
  /** Levels of the key, cut down to the owner's on every request */
  grants: AccessMap;
  /** Servers the key reaches, null for all the owner reaches */
  servers: string[] | null;
  mcp: boolean;
  createdAt: number;
  expiresAt: number | null;
  lastUsedAt: number | null;
  lastUsedIp: string | null;
}

export interface ApiKeyView {
  id: string;
  userId: string;
  /** Owner name, filled in for the list of all keys */
  username?: string;
  name: string;
  prefix: string;
  grants: AccessMap;
  servers: string[] | null;
  mcp: boolean;
  createdAt: number;
  expiresAt: number | null;
  lastUsedAt: number | null;
  lastUsedIp: string | null;
}

/** The key a request was made with, set on the user it acts as */
export interface ApiKeyPrincipal {
  id: string;
  name: string;
  mcp: boolean;
}

export interface McpSettings {
  enabled: boolean;
}
