export const assistantKeys = {
  all: ["assistant"] as const,
  status: () => [...assistantKeys.all, "status"] as const,
  settings: () => [...assistantKeys.all, "settings"] as const,
  conversations: () => [...assistantKeys.all, "conversations"] as const,
  conversation: (id: string) => [...assistantKeys.all, "conversations", id] as const,
} as const;
