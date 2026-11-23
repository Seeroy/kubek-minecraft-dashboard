import { api } from "@/api";
import type { KubekFrontendModule } from "@kubekpanel/extension-sdk";
import type { ComponentType } from "react";
import { loadIcons } from "./icons";

/**
 * Loads an extension's ESM bundle. The bundle is fetched with the auth token attached, turned into
 * a blob URL and dynamically imported (webpack must not touch the runtime specifier). Modules are
 * cached per bundle URL so repeated slot/page mounts share one instance
 */
const moduleCache = new Map<string, Promise<KubekFrontendModule | undefined>>();

export interface LoadOptions {
  /** fetch without the session, for bundles the login page shows */
  public?: boolean;
}

async function loadModule(bundleUrl: string, options: LoadOptions): Promise<KubekFrontendModule | undefined> {
  const fetchCode = options.public ? api.extensions.fetchPublicAsset : api.extensions.fetchAsset;
  const [code, icons] = await Promise.all([fetchCode(bundleUrl), loadIcons()]);
  if (window.Kubek) window.Kubek.icons = icons;
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  try {
    const mod = await import(/* webpackIgnore: true */ url);
    return mod.default ?? mod;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadExtensionModule(bundleUrl: string, options: LoadOptions = {}): Promise<KubekFrontendModule | undefined> {
  let pending = moduleCache.get(bundleUrl);
  if (!pending) {
    pending = loadModule(bundleUrl, options);
    // A failed fetch should not stick for the whole session
    pending.catch(() => moduleCache.delete(bundleUrl));
    moduleCache.set(bundleUrl, pending);
  }
  return pending;
}

/** Resolve a named component exported by an extension's KubekFrontendModule */
export async function loadExtensionComponent<P extends object = Record<string, unknown>>(
  bundleUrl: string,
  name: string,
  options: LoadOptions = {}
): Promise<ComponentType<P>> {
  const mod = await loadExtensionModule(bundleUrl, options);
  const component = mod?.components?.[name];
  if (!component) throw new Error(`Component "${name}" not found in extension bundle`);
  return component as ComponentType<P>;
}
