import type {
  Capability,
  FrontendContributions,
  KubekExtensionManifest,
  SlotName,
} from "@kubekpanel/extension-sdk";

export type {
  Capability,
  FrontendContributions,
  KubekExtensionManifest,
  SlotName
};

export type ExtensionStatus = "installed" | "active" | "disabled" | "error";

/** An installed extension as returned by GET /api/extensions */
export interface InstalledExtension {
  id: string;
  version: string;
  enabled: boolean;
  manifest: KubekExtensionManifest;
  grantedCapabilities: Capability[];
  status: ExtensionStatus;
  error?: string;
  installedAt: number;
  updatedAt?: number;
  active: boolean;
  /** Resolved icon: a data URI for file icons, or an emoji/text icon; undefined when none */
  icon?: string;
}

/** A frontend-contributing extension from GET /api/extensions/registry */
export interface ExtensionRegistryEntry {
  id: string;
  name: string;
  version: string;
  icon?: string;
  /** absolute /api path to the ESM bundle */
  bundleUrl: string;
  contributes: FrontendContributions;
  /** bundled i18n dictionaries: { <lang>: { "<key>": "<text>" } } */
  locales?: Record<string, Record<string, string>>;
}
