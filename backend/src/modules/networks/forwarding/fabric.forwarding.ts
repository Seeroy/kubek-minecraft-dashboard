import type { ForwardingMode } from "@shared/types/network.types";
import { TomlPatcher, tomlValue } from "../config/toml-patcher";
import {
  type BackendForwarding,
  editOf,
  type FileEdit,
  type ForwardingInput,
  type ServerFiles,
} from "./backend-forwarding";

export const FABRIC_PROXY_CONFIG = "config/FabricProxy-Lite.toml";
export const FABRIC_PROXY_PROJECT = "fabricproxy-lite";

// Defaults of FabricProxy-Lite 2.x
const TEMPLATE = [
  "hackOnlineMode = true",
  "hackEarlySend = false",
  "hackMessageChain = true",
  'disconnectMessage = "This server requires you to connect with Velocity."',
  'secret = ""',
  "",
].join("\n");

/** Fabric through the FabricProxy-Lite mod, Velocity modern forwarding only */
export class FabricForwarding implements BackendForwarding {
  readonly kind = "fabric" as const;

  modes(): ForwardingMode[] {
    return ["modern"];
  }

  async edits(files: ServerFiles, input: ForwardingInput): Promise<FileEdit[]> {
    const before = await files.read(FABRIC_PROXY_CONFIG);
    const after = TomlPatcher.parse(before ?? TEMPLATE)
      .setTopLevel("secret", tomlValue.string(input.secret))
      .toString();
    return editOf(FABRIC_PROXY_CONFIG, before, after);
  }
}
