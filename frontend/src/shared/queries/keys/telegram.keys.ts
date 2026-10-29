export const telegramKeys = {
  all: ["telegram"] as const,
  botInfo: () => [...telegramKeys.all, "bot-info"] as const,
  botAvatar: (botId: number) => [...telegramKeys.all, "bot-avatar", botId] as const,
  linkedUsers: () => [...telegramKeys.all, "linked-users"] as const,
} as const;
