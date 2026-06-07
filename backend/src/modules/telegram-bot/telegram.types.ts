export type TelegramLang = "en" | "ru";

/**
 * Telegram user entity interface
 */
export interface ITelegramUser {
  id: number; // Telegram user ID
  userId: string; // Kubek user ID
  username?: string;
  firstName?: string;
  lastName?: string;
  linkedAt: number;
  isActive: boolean;
  language?: TelegramLang; // Preferred bot interface language
}

/**
 * OTP code entity interface
 */
export interface IOtpCode {
  id: string;
  userId: string;
  codeHash: string;
  telegramId?: number;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}
