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

async function loadModule(bundleUrl: string): Promise<KubekFrontendModule | undefined> {
  const [code, icons] = await Promise.all([api.extensions.fetchAsset(bundleUrl), loadIcons()]);
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

export function loadExtensionModule(bundleUrl: string): Promise<KubekFrontendModule | undefined> {
  let pending = moduleCache.get(bundleUrl);
  if (!pending) {
    pending = loadModule(bundleUrl);
    moduleCache.set(bundleUrl, pending);
  }
  return pending;
}

/** Resolve a named component exported by an extension's KubekFrontendModule */
export async function loadExtensionComponent<P extends object = Record<string, unknown>>(
  bundleUrl: string,
  name: string
): Promise<ComponentType<P>> {
  const mod = await loadExtensionModule(bundleUrl);
  const component = mod?.components?.[name];
  if (!component) throw new Error(`Component "${name}" not found in extension bundle`);
  return component as ComponentType<P>;
}
