import type { ForwardingMode } from "@shared/types/network.types";
import { readYamlValue, setYamlValues } from "../config/yaml-patcher";
import {
  type BackendForwarding,
  editOf,
  type FileEdit,
  type ForwardingInput,
  isBefore,
  type ServerFiles,
} from "./backend-forwarding";

export const PAPER_GLOBAL = "config/paper-global.yml";
export const PAPER_LEGACY = "paper.yml";
export const SPIGOT_CONFIG = "spigot.yml";

const BUNGEECORD = ["settings", "bungeecord"];

/** spigot.yml bungeecord switch, shared by Spigot and Paper in legacy mode */
export async function bungeecordEdits(
  files: ServerFiles,
  enabled: boolean,
): Promise<FileEdit[]> {
  const before = await files.read(SPIGOT_CONFIG);
  // Off is the default, a missing file needs no edit
  if (!enabled && readYamlValue(before, BUNGEECORD) !== true) return [];
  return editOf(
    SPIGOT_CONFIG,
    before,
    setYamlValues(before, [[BUNGEECORD, enabled]]),
  );
}

/** Paper, Purpur and Folia: velocity section of the Paper config */
export class PaperForwarding implements BackendForwarding {
  readonly kind = "paper" as const;

  modes(gameVersion?: string): ForwardingMode[] {
    // Velocity modern forwarding needs the 1.13 login plugin channel
    return isBefore(gameVersion, "1.13") ? ["legacy"] : ["modern", "legacy"];
  }

  async edits(files: ServerFiles, input: ForwardingInput): Promise<FileEdit[]> {
    const modern = input.mode === "modern";
    const legacyLayout = isBefore(input.gameVersion, "1.19");
    const file = legacyLayout ? PAPER_LEGACY : PAPER_GLOBAL;
    const section = legacyLayout
      ? ["settings", "velocity-support"]
      : ["proxies", "velocity"];

    const before = await files.read(file);
    const values: [string[], boolean | string][] = [
      [[...section, "enabled"], modern],
    ];
    if (modern) {
      values.push([[...section, "online-mode"], true]);
      values.push([[...section, "secret"], input.secret]);
    }
    const velocity =
      !modern && before === null
        ? []
        : editOf(file, before, setYamlValues(before, values));

    return [...velocity, ...(await bungeecordEdits(files, !modern))];
  }
}
