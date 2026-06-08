import type {
  Capability,
  KubekExtensionContext,
  KubekExtensionManifest,
} from "@kubekpanel/extension-sdk";

export type ExtensionStatus = "installed" | "active" | "disabled" | "error";

/** A persisted extension row, with its manifest and granted capabilities deserialized */
export interface ExtensionRecord {
  id: string;
  version: string;
  enabled: boolean;
  manifest: KubekExtensionManifest;
  grantedCapabilities: Capability[];
  status: ExtensionStatus;
  error?: string;
  installedAt: number;
  updatedAt?: number;
}

/** Shape the backend of extension exports (default export or named functions) */
export interface KubekBackendModule {
  activate(ctx: KubekExtensionContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

/** A currently-loaded extension: its record plus runtime handles for teardown */
export interface LoadedExtension {
  record: ExtensionRecord;
  module: KubekBackendModule;
  ctx: KubekExtensionContext;
  /** subscriptions/registrations to unwind on disable */
  dispose: Array<() => void>;
}

/** Thrown by context API families the extension was not granted */
export class CapabilityDeniedError extends Error {
  constructor(capability: Capability, extId: string) {
    super(`Extension "${extId}" lacks capability "${capability}"`);
    this.name = "CapabilityDeniedError";
  }
}
