import { Injectable, Logger } from "@nestjs/common";
import type {
  AssistantToolCall,
  IAssistantMessage,
} from "@shared/types/assistant.types";

export type AssistantRunEvent =
  | { type: "delta"; messageId: string; text: string; channel?: "reasoning" }
  | { type: "message"; message: IAssistantMessage }
  | { type: "tool"; messageId: string; call: AssistantToolCall }
  | { type: "confirm"; messageId: string; call: AssistantToolCall }
  | { type: "done"; finished: boolean }
  | { type: "error"; error: string };

type Listener = (event: AssistantRunEvent) => void;

/** Run events per conversation for transports other than the web socket, like the Telegram bot */
@Injectable()
export class AssistantEventsService {
  private readonly logger = new Logger(AssistantEventsService.name);
  private readonly listeners = new Map<string, Set<Listener>>();

  /** Returns the unsubscribe function */
  on(conversationId: string, listener: Listener): () => void {
    let set = this.listeners.get(conversationId);
    if (!set) this.listeners.set(conversationId, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(conversationId);
    };
  }

  emit(conversationId: string, event: AssistantRunEvent): void {
    for (const listener of this.listeners.get(conversationId) ?? []) {
      // A broken listener must not stop the run or the other listeners
      try {
        listener(event);
      } catch (err) {
        this.logger.warn(`Assistant listener failed: ${String(err)}`);
      }
    }
  }
}
