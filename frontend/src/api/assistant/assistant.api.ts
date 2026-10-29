import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  AssistantConnectionDraft,
  AssistantConversationDetail,
  AssistantMessageContext,
  AssistantPreset,
  AssistantSendResult,
  AssistantSettingsUpdate,
  AssistantSettingsView,
  AssistantStatus,
  AssistantTestResult,
  IAssistantConversation,
} from "@shared/types/assistant.types";

export interface AssistantSettingsResponse {
  settings: AssistantSettingsView;
  presets: AssistantPreset[];
}

export class AssistantApi {
  constructor(private authHttp: AuthHttpClient) {}

  status = (): Promise<AssistantStatus> => this.authHttp.get<AssistantStatus>("assistant/status");

  getSettings = (): Promise<AssistantSettingsResponse> => this.authHttp.get<AssistantSettingsResponse>("assistant/settings");

  updateSettings = (patch: AssistantSettingsUpdate): Promise<AssistantSettingsView> =>
    this.authHttp.put<AssistantSettingsView>("assistant/settings", { json: patch });

  revealKey = async (): Promise<string | null> => (await this.authHttp.get<{ value: string | null }>("assistant/settings/api-key")).value;

  models = async (draft: AssistantConnectionDraft): Promise<string[]> =>
    (await this.authHttp.post<{ models: string[] }>("assistant/settings/models", { json: draft })).models;

  test = (draft: AssistantConnectionDraft): Promise<AssistantTestResult> => this.authHttp.post<AssistantTestResult>("assistant/settings/test", { json: draft });

  conversations = (): Promise<IAssistantConversation[]> => this.authHttp.get<IAssistantConversation[]>("assistant/conversations");

  conversation = (id: string): Promise<AssistantConversationDetail> => this.authHttp.get<AssistantConversationDetail>(`assistant/conversations/${id}`);

  /** Starts a new conversation when id is missing */
  send = (id: string | null, content: string, context: AssistantMessageContext): Promise<AssistantSendResult> =>
    this.authHttp.post<AssistantSendResult>(id ? `assistant/conversations/${id}/messages` : "assistant/conversations", {
      json: { content, ...context },
    });

  confirm = async (id: string, callId: string, approve: boolean): Promise<void> => {
    await this.authHttp.post<void>(`assistant/conversations/${id}/confirm`, { json: { callId, approve } });
  };

  stop = async (id: string): Promise<void> => {
    await this.authHttp.post<void>(`assistant/conversations/${id}/stop`);
  };

  remove = async (id: string): Promise<void> => {
    await this.authHttp.delete<void>(`assistant/conversations/${id}`);
  };
}

export const assistantApi = new AssistantApi(authHttp);
