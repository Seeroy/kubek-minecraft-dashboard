export interface IConfiguration {
  eulaAccepted: boolean;
  ftpd: FTPService;
  authorization: boolean;
  subnetsAccessRestriction: SubnetsAccess;
  telegramBot: TelegramBot;
  telemetry?: TelemetrySettings;
  port: number;
  configVersion: number;

  [key: string]: any;
}

export type TelemetrySettings = {
  enabled: boolean;
};

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
  username?: string;
  password?: string;
  port?: number;
};
