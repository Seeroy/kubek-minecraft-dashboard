import type { SecretHint } from "../secret.types";

/** Panel settings, same for the backend and the settings API */
export interface IPanelSettings {
  eulaAccepted: boolean;
  ftpd: FTPService;
  authorization: boolean;
  subnetsAccessRestriction: SubnetsAccess;
  telegramBot: TelegramBot;
  telemetry?: TelemetrySettings;
  /** Live CPU and memory sampling of server processes */
  serverStats?: ServerStatsSettings;
  port: number;
  configVersion: number;
  /** Which runtime new servers use, "auto" prefers docker when the daemon is up */
  serverRuntime?: ServerRuntimeSetting;
}

export interface IMainConfig extends IPanelSettings {
  /** Secret fields come back blank, their state is described here */
  secrets: ConfigSecrets;
}

export interface ConfigSecrets {
  "telegramBot.token": SecretHint;
}

export type ServerRuntimeSetting = "auto" | "native" | "docker";

export type SubnetsAccess = {
  enabled: boolean;
  subnets?: string[];
};

export type TelegramBot = {
  enabled: boolean;
  token?: string;
  chatIds?: string[];
};

export type FTPService = {
  enabled: boolean;
  port?: number;
};

export type TelemetrySettings = {
  enabled: boolean;
};

export type ServerStatsSettings = {
  enabled: boolean;
};
