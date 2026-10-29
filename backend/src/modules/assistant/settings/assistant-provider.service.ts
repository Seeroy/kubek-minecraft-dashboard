import { getErrorMessage } from "@/core/utils/error";
import { BadGatewayException, Injectable } from "@nestjs/common";
import type {
  AssistantConnectionDraft,
  AssistantTestResult,
} from "@shared/types/assistant.types";
import { LlmClient } from "../llm/llm-client";
import { AssistantSettingsService } from "./assistant-settings.service";

/** Talks to the configured provider on behalf of the settings form */
@Injectable()
export class AssistantProviderService {
  constructor(private readonly settings: AssistantSettingsService) {}

  async models(draft?: AssistantConnectionDraft): Promise<string[]> {
    try {
      return await this.client(draft).listModels();
    } catch (err) {
      throw new BadGatewayException(getErrorMessage(err));
    }
  }

  /** Sends a one word prompt, which proves the URL, the key and the model */
  async test(draft: AssistantConnectionDraft): Promise<AssistantTestResult> {
    const started = Date.now();
    const model = draft.model || this.settings.get().model;
    try {
      if (!model) throw new Error("Choose a model first");
      await this.client(draft).stream({
        model,
        temperature: 0,
        messages: [{ role: "user", content: "Reply with the single word OK" }],
      });
      return { ok: true, latencyMs: Date.now() - started, error: null };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: getErrorMessage(err),
      };
    }
  }

  private client(draft?: AssistantConnectionDraft): LlmClient {
    return new LlmClient(this.settings.connection(draft));
  }
}
