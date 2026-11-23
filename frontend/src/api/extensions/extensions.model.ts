import type { SettingField } from "@kubekpanel/extension-sdk";

export type { CatalogExtension, CatalogReadmeResponse, CatalogResponse } from "@shared/types/catalog.types";
export type {
  Capability,
  ExtensionRegistryEntry,
  ExtensionStatus,
  InstalledExtension
} from "@/shared/types/extensions.types";
export type { SettingField };

/** A palette command from GET /api/extensions/commands, only the ones the user may run */
export interface ExtensionCommand {
  extId: string;
  extName: string;
  id: string;
  title: string;
  /** lucide icon name */
  icon?: string | null;
  permission?: string | null;
}

/** GET /api/extensions/:id/settings, secret values never come back, only whether one is stored */
export interface ExtensionSettingsResponse {
  schema: SettingField[];
  values: Record<string, unknown>;
  secrets: Record<string, boolean>;
}

/** PUT /api/extensions/:id/settings, a secret is set by a string, cleared by null and kept when left out */
export interface ExtensionSettingsUpdate {
  values: Record<string, unknown>;
}
