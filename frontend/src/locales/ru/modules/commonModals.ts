import type { TranslationDictionary } from "../../../locales/types";

export const commonModalsTranslations: TranslationDictionary = {
  confirm: {
    defaultTitle: "Подтвердите действие",
    confirmText: "Подтвердить",
    cancelText: "Отмена",
  },
  prompt: {
    defaultTitle: "Введите значение",
    confirmText: "Подтвердить",
    cancelText: "Отмена",
    validationRequired: "Поле не может быть пустым",
  },
  alert: {
    confirmText: "Понятно",
    variants: {
      info: "Информация",
      warning: "Предупреждение",
      error: "Ошибка",
      success: "Готово",
    },
  },
  confirmWithPassword: {
    defaultTitle: "Подтвердите действие",
    passwordLabel: "Ваш пароль",
    passwordPlaceholder: "Введите пароль",
    nameLabel: "Введите имя для подтверждения",
    nameMismatch: "Имя не совпадает",
    passwordRequired: "Введите пароль",
    confirmText: "Подтвердить",
    cancelText: "Отмена",
  },
};
