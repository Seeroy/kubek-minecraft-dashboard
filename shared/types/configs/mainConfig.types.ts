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
  /** Port the panel listens on now, a changed port applies after restart */
  listen: ListenInfo;
}

export interface ListenInfo {
  port: number;
  /** Set by the PORT env, the port setting is ignored then */
  fromEnv: boolean;
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
  /** The AI assistant answers in the bot, on unless set to false */
  assistant?: boolean;
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
