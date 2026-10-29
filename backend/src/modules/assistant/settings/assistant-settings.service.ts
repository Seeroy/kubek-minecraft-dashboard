import { resolveSecret, secretHint } from "@/core/utils/secrets";
import { ConfigService } from "@/modules/config/config.service";
import { Injectable } from "@nestjs/common";
import type {
  AssistantConnectionDraft,
  AssistantSettings,
  AssistantSettingsUpdate,
  AssistantSettingsView,
  AssistantStatus,
} from "@shared/types/assistant.types";
import type { LlmConnection } from "../llm/llm.types";
import { findPreset } from "../llm/presets";

const CONFIG_KEY = "assistant";

type StoredSettings = AssistantSettings & { apiKey?: string };

const DEFAULTS: AssistantSettings = {
  enabled: false,
  preset: "ollama",
  baseUrl: findPreset("ollama").baseUrl,
  model: "",
  temperature: 0.3,
  maxSteps: 8,
};

/** Panel wide provider settings, kept in config_kv under "assistant" */
@Injectable()
export class AssistantSettingsService {
  constructor(private readonly config: ConfigService) {}

  get(): AssistantSettings {
    const { enabled, preset, baseUrl, model, temperature, maxSteps } =
      this.stored();
    return { enabled, preset, baseUrl, model, temperature, maxSteps };
  }

  view(): AssistantSettingsView {
    const stored = this.stored();
    return { ...this.get(), apiKey: secretHint(stored.apiKey) };
  }

  status(): AssistantStatus {
    const settings = this.get();
    const configured = this.isConfigured();
    return {
      enabled: settings.enabled,
      configured,
      model: configured ? settings.model : null,
      provider: configured ? findPreset(settings.preset).label : null,
    };
  }

  isConfigured(): boolean {
    const { enabled, baseUrl, model } = this.get();
    return enabled && !!baseUrl && !!model;
  }

  update(patch: AssistantSettingsUpdate): AssistantSettingsView {
    const current = this.stored();
    const { apiKey, ...rest } = patch;
    const next: StoredSettings = { ...current, ...rest };
    next.apiKey =
      apiKey === null ? undefined : resolveSecret(current.apiKey, apiKey);
    next.baseUrl = next.baseUrl.trim().replace(/\/+$/, "");
    this.config.set(CONFIG_KEY, next);
    return this.view();
  }

  /** Detached copy with the key, for an audit diff only */
  snapshot(): StoredSettings {
    return structuredClone(this.stored());
  }

  revealKey(): string | null {
    return this.stored().apiKey || null;
  }

  /** Saved connection, or a draft from the settings form over the saved key */
  connection(draft?: AssistantConnectionDraft): LlmConnection {
    const stored = this.stored();
    if (!draft) return { baseUrl: stored.baseUrl, apiKey: stored.apiKey };
    return {
      baseUrl: draft.baseUrl.trim(),
      apiKey: resolveSecret(stored.apiKey, draft.apiKey),
    };
  }

  private stored(): StoredSettings {
    const saved = this.config.get(CONFIG_KEY) as
      Partial<StoredSettings> | undefined;
    return { ...DEFAULTS, ...(saved ?? {}) };
  }
}
