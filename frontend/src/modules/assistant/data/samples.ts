import type { IAssistantConversation } from "@shared/types/assistant.types";

const conversation = (i: number, title: string): IAssistantConversation => ({
  id: `sample-${i}`,
  title,
  serverId: null,
  createdAt: 1_760_000_000_000,
  updatedAt: 1_760_000_000_000,
});

export const SAMPLE_CONVERSATIONS: IAssistantConversation[] = [
  conversation(1, "Why does the server lag at night"),
  conversation(2, "Set up a daily backup task"),
  conversation(3, "Install a permissions plugin"),
  conversation(4, "Explain the crash log"),
];
