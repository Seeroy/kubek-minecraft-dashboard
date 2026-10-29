import { stopTimeoutSec } from "@/core/utils/stopTimeout";

// In-flight stop, settled when the process exits or given up after a kill
export class PendingStop {
  private settle?: (ok: boolean) => void;
  private timer?: ReturnType<typeof setTimeout>;
  private promise?: Promise<boolean>;

  get current(): Promise<boolean> | undefined {
    return this.promise;
  }

  begin(escalate: () => void): Promise<boolean> {
    this.promise = new Promise<boolean>((resolve) => {
      this.settle = resolve;
      // If a graceful stop hangs, escalate to SIGKILL so the server can't stick in STOPPING
      this.timer = setTimeout(() => {
        if (!this.settle) return;
        escalate();
        this.timer = setTimeout(() => this.finish(false), 3000);
      }, stopTimeoutSec() * 1000);
    }).finally(() => {
      this.promise = undefined;
    });
    return this.promise;
  }

  // Process exited
  exited(): void {
    if (!this.settle) return;
    if (this.timer) clearTimeout(this.timer);
    this.finish(true);
  }

  private finish(ok: boolean): void {
    const settle = this.settle;
    if (!settle) return;
    this.settle = undefined;
    settle(ok);
  }
}
