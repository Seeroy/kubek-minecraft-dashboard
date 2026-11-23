"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import type { SlotName } from "@kubekpanel/extension-sdk";
import { useMemo, type ReactNode } from "react";
import { DynamicExtensionComponent } from "./DynamicExtensionComponent";
import { collectSlotMounts, type SlotMount } from "./slot-mounts";

/** Components active extensions mount into a slot, in their declared order */
export function useExtensionSlotMounts(name: SlotName): SlotMount[] {
  const { data: registry } = useExtensionRegistry();
  return useMemo(() => collectSlotMounts(registry, name), [registry, name]);
}

interface MountsProps {
  mounts: SlotMount[];
  context?: unknown;
  publicBundle?: boolean;
  loading?: ReactNode;
}

export const SlotMounts = ({ mounts, context, publicBundle, loading }: MountsProps) => (
  <>
    {mounts.map(({ ext, slot }) => (
      <DynamicExtensionComponent
        key={`${ext.id}:${slot.component}`}
        bundleUrl={ext.bundleUrl}
        name={slot.component}
        props={{ context }}
        publicBundle={publicBundle}
        loading={loading}
      />
    ))}
  </>
);

interface Props {
  name: SlotName;
  /** arbitrary context handed to every component mounted in this slot */
  context?: unknown;
}

export const ExtensionSlot = ({ name, context }: Props) => {
  const mounts = useExtensionSlotMounts(name);
  if (!mounts.length) return null;
  return <SlotMounts mounts={mounts} context={context} />;
};
