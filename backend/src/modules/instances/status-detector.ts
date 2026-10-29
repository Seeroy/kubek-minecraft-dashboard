import { lastStatusMatch } from "@/modules/server-types/runtime/docker-logs";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { ServerStatus } from "@shared/types/server/server.types";

interface CompiledDetection {
  starting: RegExp[];
  running: RegExp[];
  stopping: RegExp[];
}

// Fallback patterns for legacy servers
const LEGACY_DETECTION: CompiledDetection = {
  starting: [
    /Starting minecraft server/i,
    /Loading properties/i,
    /Preparing spawn area/i,
    /Starting server/i,
  ],
  running: [
    /Done \(.*\)! For help/i,
    /Server startup complete/i,
    /ALL SYSTEMS STARTED SUCCESSFULLY/i,
  ],
  stopping: [/Stopping (the )?server/i, /Saving worlds/i, /Saving players/i],
};

/** Build status patterns from the blueprint, falling back to legacy mc patterns */
function compileDetection(
  blueprint: KubekBlueprintManifest | undefined,
): CompiledDetection {
  const d = blueprint?.detection;
  if (!d) return LEGACY_DETECTION;
  const compile = (patterns?: string[]) =>
    (patterns ?? []).map((p) => new RegExp(p, "i"));
  return {
    starting: compile(d.starting),
    running: compile(d.running),
    stopping: compile(d.stopping),
  };
}

/** Status from a console line, by blueprint patterns */
export class StatusDetector {
  private readonly detection: CompiledDetection;

  constructor(blueprint: KubekBlueprintManifest | undefined) {
    this.detection = compileDetection(blueprint);
  }

  /** Status of one line, starting > running > stopping */
  detect(line: string): ServerStatus | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (this.detection.starting.some((re) => re.test(trimmed)))
      return ServerStatus.STARTING;
    if (this.detection.running.some((re) => re.test(trimmed)))
      return ServerStatus.RUNNING;
    if (this.detection.stopping.some((re) => re.test(trimmed)))
      return ServerStatus.STOPPING;
    return null;
  }

  /** Last status in old lines, for replayed history */
  last(lines: string[]): ServerStatus | undefined {
    return lastStatusMatch(lines, [
      { status: ServerStatus.STARTING, res: this.detection.starting },
      { status: ServerStatus.RUNNING, res: this.detection.running },
      { status: ServerStatus.STOPPING, res: this.detection.stopping },
    ]);
  }
}
