import type { TranslationDictionary } from "../../../locales/types";

export const authTranslations: TranslationDictionary = {
  modal: {
    eyebrow: "Welcome back",
    title: "Sign in",
    description: "Enter your username and password to continue",
    form: {
      username: {
        label: "Username",
        placeholder: "Enter your username",
        errors: {
          min: "Username must be at least 3 characters",
          max: "Username must not exceed 32 characters",
          regex: "Username can only contain letters, numbers and underscores",
        }
      },
      password: {
        label: "Password",
        placeholder: "Enter your password",
        showPassword: "Show password",
        hidePassword: "Hide password",
        errors: {
          min: "Password must be at least 6 characters",
          max: "Password must not exceed 64 characters",
        }
      },
      submit: {
        default: "Sign In",
        loading: "Signing in...",
      }
    },
    errors: {
      loginFailed: "Login failed",
      invalidResponse: "Login failed: Invalid server response",
      networkError: "Network error: Please check your connection",
      unexpected: "An unexpected error occurred",
    }
  },
  twoFactor: {
    back: "Back",
    totpTitle: "Authenticator code",
    telegramTitle: "Telegram confirmation",
    totpLabel: "Enter the 6-digit code",
    confirm: "Confirm",
    telegramPrompt: "Open the Telegram bot and approve the sign-in",
    telegramHint: (time: string) =>
      `A request was sent to your linked Telegram account. Expires in ${ time }.`,
    useTotp: "Use authenticator code",
    useTelegram: "Confirm via Telegram",
    attemptsLeft: (n: number) => `Attempts left: ${ n }`,
    errors: {
      invalidCode: "Invalid code",
      locked: "Too many attempts. The challenge is locked, please start over.",
      telegramDenied: "Sign-in denied in Telegram",
      expired: "Confirmation time has expired",
      switchFailed: "Failed to switch method",
    }
  }
};
