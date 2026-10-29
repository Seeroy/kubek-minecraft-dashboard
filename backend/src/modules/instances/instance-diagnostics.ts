import { ErrorRecognizerService } from "@/modules/error-recognition/error-recognizer.service";
import { ServerEventsService } from "@/ws/services/server-events.service";
import type { IServerDiagnostic } from "@shared/types/server/instance.types";

const MAX_DIAGNOSTICS = 20;

// Recent recognized errors and health issues, in memory only
export class InstanceDiagnostics {
  private items: IServerDiagnostic[] = [];

  constructor(
    private readonly serverId: string,
    private readonly recognizer: ErrorRecognizerService,
    private readonly events: ServerEventsService,
  ) {}

  check(line: string): void {
    const error = this.recognizer.recognizeError(line);
    if (!error) return;
    this.record({
      errorType: error.errorType,
      severity: error.severity,
      timestamp: new Date().toISOString(),
    });
    this.events.emitServerError(this.serverId, error);
  }

  record(diagnostic: IServerDiagnostic): void {
    this.items.push(diagnostic);
    if (this.items.length > MAX_DIAGNOSTICS) {
      this.items = this.items.slice(-MAX_DIAGNOSTICS);
    }
  }

  clear(errorType: string): void {
    this.items = this.items.filter((d) => d.errorType !== errorType);
  }

  get(): IServerDiagnostic[] {
    return this.items;
  }
}
