import { getErrorMessage } from "@/core/utils/error";
import { Injectable, Logger } from "@nestjs/common";
import type {
  AppEventHandler,
  AppEventMap,
  AppEventName,
} from "./app-events.types";

/**
 * Typed in-process event bus between core modules. Handlers run detached
 * from the emitter, so a slow or failing subscriber never breaks the producer
 */
@Injectable()
export class AppEventsService {
  private readonly logger = new Logger(AppEventsService.name);
  private readonly handlers = new Map<
    AppEventName,
    Set<AppEventHandler<any>>
  >();

  on<K extends AppEventName>(
    event: K,
    handler: AppEventHandler<K>,
  ): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  emit<K extends AppEventName>(event: K, payload: AppEventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      queueMicrotask(() => void this.run(event, handler, payload));
    }
  }

  private async run<K extends AppEventName>(
    event: K,
    handler: AppEventHandler<K>,
    payload: AppEventMap[K],
  ): Promise<void> {
    try {
      await handler(payload);
    } catch (err) {
      this.logger.warn(`Handler for ${event} failed: ${getErrorMessage(err)}`);
    }
  }
}
