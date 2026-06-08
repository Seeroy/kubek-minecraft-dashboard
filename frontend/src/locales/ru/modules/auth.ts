import type { TranslationDictionary } from "../../../locales/types";

export const authTranslations: TranslationDictionary = {
  modal: {
    eyebrow: "С возвращением",
    title: "Вход",
    description: "Введите имя пользователя и пароль, чтобы продолжить",
    form: {
      username: {
        label: "Имя пользователя",
        placeholder: "Введите имя пользователя",
        errors: {
          min: "Имя пользователя должно содержать минимум 3 символа",
          max: "Имя пользователя не должно превышать 32 символа",
          regex: "Имя пользователя может содержать только буквы, цифры и подчеркивания",
        }
      },
      password: {
        label: "Пароль",
        placeholder: "Введите пароль",
        showPassword: "Показать пароль",
        hidePassword: "Скрыть пароль",
        errors: {
          min: "Пароль должен содержать минимум 6 символов",
          max: "Пароль не должен превышать 64 символа",
        }
      },
      submit: {
        default: "Войти",
        loading: "Вход...",
      }
    },
    errors: {
      loginFailed: "Ошибка входа",
      invalidResponse: "Ошибка входа: Неверный ответ сервера",
      networkError: "Ошибка сети: Проверьте подключение",
      unexpected: "Произошла неожиданная ошибка",
    }
  },
  twoFactor: {
    back: "Назад",
    totpTitle: "Код из приложения",
    telegramTitle: "Подтверждение в Telegram",
    totpLabel: "Введите 6-значный код",
    confirm: "Подтвердить",
    telegramPrompt: "Откройте Telegram-бот и подтвердите вход",
    telegramHint: (time: string) =>
      `Запрос отправлен на привязанный Telegram-аккаунт. Истекает через ${ time }.`,
    useTotp: "Использовать код из приложения",
    useTelegram: "Подтвердить через Telegram",
    attemptsLeft: (n: number) => `Осталось попыток: ${ n }`,
    errors: {
      invalidCode: "Неверный код",
      locked: "Слишком много попыток. Запрос заблокирован, начните заново.",
      telegramDenied: "Вход отклонён в Telegram",
      expired: "Время на подтверждение истекло",
      switchFailed: "Не удалось переключить метод",
    }
  }
};
