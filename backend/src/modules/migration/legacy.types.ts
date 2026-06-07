// On-disk JSON shapes from the legacy (pre-2026) Kubek version
// Fields are optional because the source may be hand-edited
//   ./config.json          -> LegacyConfig
//   ./users.json           -> Record<username, LegacyUser>
//   ./servers/servers.json -> Record<serverName, LegacyServer>

export interface LegacyConfig {
  language?: string;
  eulaAccepted?: boolean;
  authorization?: boolean;
  allowOnlyIPsList?: boolean;
  IPsAllowed?: string[];
  webserverPort?: number;
  configVersion?: number;
  ftpd?: {
    enabled?: boolean;
    username?: string;
    password?: string;
    port?: number;
  };
  telegramBot?: {
    enabled?: boolean;
    token?: string;
    chatIds?: (string | number)[];
  };
}

export interface LegacyUser {
  username?: string;
  password?: string;
  email?: string;
  secret?: string;
  permissions?: string[];
  serversAccessRestricted?: boolean;
  // server names (the old id), not UUIDs
  serversAllowed?: string[];
}

export interface LegacyServer {
  status?: string;
  restartOnError?: boolean;
  maxRestartAttempts?: number;
  game?: string;
  // "java" | "bedrock"
  minecraftType?: string;
  stopCommand?: string;
}

export type LegacyUsersFile = Record<string, LegacyUser>;
export type LegacyServersFile = Record<string, LegacyServer>;
