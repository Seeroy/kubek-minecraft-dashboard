import type { ForwardingMode } from "@shared/types/network.types";
import type {
  BackendForwarding,
  FileEdit,
  ServerFiles,
} from "./backend-forwarding";
import { bungeecordEdits } from "./paper.forwarding";

/** Plain Spigot only knows the BungeeCord protocol */
export class SpigotForwarding implements BackendForwarding {
  readonly kind = "spigot" as const;

  modes(): ForwardingMode[] {
    return ["legacy"];
  }

  edits(files: ServerFiles): Promise<FileEdit[]> {
    return bungeecordEdits(files, true);
  }
}
