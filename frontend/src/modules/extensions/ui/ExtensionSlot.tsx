"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import type { SlotName } from "@kubekpanel/extension-sdk";
import { useMemo } from "react";
import { DynamicExtensionComponent } from "./DynamicExtensionComponent";

interface Props {
  name: SlotName;
  /** arbitrary context handed to every component mounted in this slot */
  context?: unknown;
}

export const ExtensionSlot = ({ name, context }: Props) => {
  const { data: registry } = useExtensionRegistry();

  const mounts = useMemo(
    () =>
      (registry ?? [])
        .flatMap((ext) =>
          (ext.contributes.slots ?? [])
            .filter((s) => s.slot === name)
            .map((s) => ({ ext, slot: s }))
        )
        .sort((a, b) => (a.slot.order ?? 0) - (b.slot.order ?? 0)),
    [registry, name]
  );

  if (!mounts.length) return null;

  return (
    <>
      {mounts.map(({ ext, slot }) => (
        <DynamicExtensionComponent
          key={`${ext.id}:${slot.component}`}
          bundleUrl={ext.bundleUrl}
          name={slot.component}
          props={{ context }}
        />
      ))}
    </>
  );
};
