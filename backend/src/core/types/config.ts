import type { McpSettings } from "@shared/types/api-key.types";
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
  /** Off until an admin turns it on */
  mcp?: McpSettings;
  [key: string]: any;
}
