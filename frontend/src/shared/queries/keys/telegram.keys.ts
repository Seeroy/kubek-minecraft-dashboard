export const telegramKeys = {
  all: ["telegram"] as const,
  botInfo: () => [...telegramKeys.all, "bot-info"] as const,
  linkedUsers: () => [...telegramKeys.all, "linked-users"] as const,
} as const;
