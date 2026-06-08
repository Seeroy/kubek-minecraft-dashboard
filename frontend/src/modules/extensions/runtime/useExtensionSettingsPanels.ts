"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import { useMemo } from "react";

export interface ExtensionSettingsPanel {
  extId: string;
  id: string;
  /** i18n key or plain label */
  label: string;
  /** component name exported by the extension's KubekFrontendModule */
  component: string;
  permission?: string;
  /** ESM bundle to load the component from */
  bundleUrl: string;
}

/** Settings panels from active extensions, embedded as tabs in the panel Settings page */
export function useExtensionSettingsPanels(): ExtensionSettingsPanel[] {
  const { data: registry } = useExtensionRegistry();

  return useMemo(
    () =>
      (registry ?? []).flatMap((ext) =>
        (ext.contributes.settingsPanels ?? []).map((p) => ({
          extId: ext.id,
          id: p.id,
          label: p.label,
          component: p.component,
          permission: p.permission,
          bundleUrl: ext.bundleUrl,
        }))
      ),
    [registry]
  );
}
