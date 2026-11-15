import { Injectable } from "@nestjs/common";
import type { AssistantCapabilities } from "@shared/types/assistant.types";
import { LlmClient } from "../llm/llm-client";
import { capsFromEntry, UNKNOWN_CAPS, type ModelCaps } from "../llm/model-caps";
import {
  hasWebSearch,
  providerKind,
  type ProviderKind,
} from "../llm/provider-features";
import { AssistantSettingsService } from "./assistant-settings.service";

const TTL_MS = 10 * 60_000;
// A provider that failed to list models is asked again sooner
const FAILED_TTL_MS = 60_000;

export interface ResolvedCapabilities extends AssistantCapabilities {
  kind: ProviderKind;
  reasoningMandatory: boolean;
}

/** What the configured model can do, from the provider's model list and the settings */
@Injectable()
export class ModelCapabilitiesService {
  private cache: { key: string; at: number; ttl: number; caps: ModelCaps } | null =
    null;

  constructor(private readonly settings: AssistantSettingsService) {}

  async resolve(): Promise<ResolvedCapabilities> {
    const settings = this.settings.get();
    const kind = providerKind(settings.preset, settings.baseUrl);
    const caps = settings.model ? await this.modelCaps(kind) : UNKNOWN_CAPS;
    return {
      kind,
      vision:
        settings.vision === "auto" ? caps.vision : settings.vision === "on",
      reasoning: caps.reasoning,
      reasoningMandatory: caps.reasoningMandatory,
      webSearch: hasWebSearch(kind),
    };
  }

  private async modelCaps(kind: ProviderKind): Promise<ModelCaps> {
    const { baseUrl, model } = this.settings.get();
    const key = `${baseUrl}|${model}`;
    const cached = this.cache;
    if (cached?.key === key && Date.now() - cached.at < cached.ttl)
      return cached.caps;

    let caps: ModelCaps;
    let ttl = TTL_MS;
    try {
      const entries = await new LlmClient(
        this.settings.connection(),
      ).listModelEntries();
      const entry = entries.find((item) => item.id === model);
      caps = entry ? capsFromEntry(entry) : UNKNOWN_CAPS;
    } catch {
      caps = UNKNOWN_CAPS;
      ttl = FAILED_TTL_MS;
    }
    caps = withKnownModels(kind, model, caps);
    this.cache = { key, at: Date.now(), ttl, caps };
    return caps;
  }
}

// DeepSeek lists bare ids, its docs say flash reads images and every model thinks
function withKnownModels(
  kind: ProviderKind,
  model: string,
  caps: ModelCaps,
): ModelCaps {
  if (kind !== "deepseek") return caps;
  return {
    vision: caps.vision ?? /flash/i.test(model),
    reasoning: caps.reasoning ?? true,
    reasoningMandatory: caps.reasoningMandatory,
  };
}
