import type { IServer } from "@shared/types/server/server.types";

export type CrashVerdict = "restart" | "exhausted" | "off";

// restartOnError bookkeeping: crash restarts in a row, reset when it's up or started by hand
export class CrashRestartPolicy {
  private attempts = 0;

  get count(): number {
    return this.attempts;
  }

  reset(): void {
    this.attempts = 0;
  }

  // Counts the attempt when the verdict is a restart
  onCrash(
    setting: IServer["restartOnError"] | undefined,
    suppressed: boolean,
  ): CrashVerdict {
    if (!setting?.enabled || suppressed) return "off";
    if (this.attempts >= (setting.attempts || 3)) return "exhausted";
    this.attempts++;
    return "restart";
  }
}
