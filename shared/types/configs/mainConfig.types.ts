export interface IMainConfig {
  eulaAccepted: boolean;
  ftpd: FTPService;
  authorization: boolean;
  subnetsAccessRestriction: SubnetsAccess;
  telegramBot: TelegramBot;
  telemetry?: TelemetrySettings;
  port: number;
  configVersion: number;
}

type SubnetsAccess = {
  enabled: boolean;
  subnets?: string[];
};

type TelegramBot = {
  enabled: boolean;
  token?: string;
  chatIds?: string[];
};

type FTPService = {
  enabled: boolean;
  username?: string;
  password?: string;
  port?: number;
};

export type TelemetrySettings = {
  enabled: boolean;
};
