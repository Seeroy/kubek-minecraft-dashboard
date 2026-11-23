import type { ExtensionRegistryEntry } from "@/shared/types/extensions.types";
import type { SlotContribution, SlotName } from "@kubekpanel/extension-sdk";

export interface SlotMount {
  ext: ExtensionRegistryEntry;
  slot: SlotContribution;
}

export function collectSlotMounts(registry: ExtensionRegistryEntry[] | undefined, name: SlotName): SlotMount[] {
  return (registry ?? [])
    .flatMap((ext) => (ext.contributes.slots ?? []).filter((s) => s.slot === name).map((slot) => ({ ext, slot })))
    .sort((a, b) => (a.slot.order ?? 0) - (b.slot.order ?? 0));
}
