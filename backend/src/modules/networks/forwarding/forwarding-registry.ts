import type {
  BackendForwardingKind,
  ForwardingMode,
} from "@shared/types/network.types";
import type { BackendForwarding } from "./backend-forwarding";
import { FabricForwarding } from "./fabric.forwarding";
import { PaperForwarding } from "./paper.forwarding";
import { SpigotForwarding } from "./spigot.forwarding";

export const VELOCITY_BLUEPRINT_ID = "com.kubek.velocity";

const paper = new PaperForwarding();
const fabric = new FabricForwarding();
const spigot = new SpigotForwarding();

const BY_BLUEPRINT: Record<string, BackendForwarding> = {
  "com.kubek.paper": paper,
  "com.kubek.purpur": paper,
  "com.kubek.folia": paper,
  "com.kubek.fabric": fabric,
  "com.kubek.spigot": spigot,
};

export function forwardingFor(
  blueprintId: string,
): BackendForwarding | undefined {
  return BY_BLUEPRINT[blueprintId];
}

export function creatableBackends(): {
  blueprintId: string;
  kind: BackendForwardingKind;
}[] {
  return Object.entries(BY_BLUEPRINT).map(([blueprintId, strategy]) => ({
    blueprintId,
    kind: strategy.kind,
  }));
}

/**
 * Modern when every backend supports it, otherwise legacy. Null when the
 * backends have no mode in common
 */
export function commonMode(
  modes: ForwardingMode[][],
  wanted?: ForwardingMode,
): ForwardingMode | null {
  const shared = (["modern", "legacy"] as const).filter((mode) =>
    modes.every((list) => list.includes(mode)),
  );
  if (wanted) return shared.includes(wanted) ? wanted : null;
  return shared[0] ?? null;
}
