import type { IPanelSettings } from "@shared/types/configs/mainConfig.types";

export type {
  FTPService,
  ServerRuntimeSetting,
  ServerStatsSettings,
  SubnetsAccess,
  TelegramBot,
  TelemetrySettings,
} from "@shared/types/configs/mainConfig.types";

export interface IConfiguration extends IPanelSettings {
  [key: string]: any;
}
