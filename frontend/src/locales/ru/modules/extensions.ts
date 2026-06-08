import type { TranslationDictionary } from "../../../locales/types";

export const extensionsTranslations: TranslationDictionary = {
  header: {
    kicker: "Расширения",
    title: "Расширения",
    description: "Устанавливайте расширения панели, проверяйте запрашиваемый доступ, включайте или удаляйте их",
  },
  upload: {
    hint: "Загрузите пакет .kubekext",
    choose: "Выбрать файл",
  },
  securityNotice: {
    title: "Код расширений выполняется без изоляции",
    description: "Устанавливаемые расширения исполняются в процессе панели без песочницы (alpha). Ставьте только из доверенных источников. Установка доступна только администраторам.",
  },
  list: {
    loading: "Загрузка",
    empty: "Нет установленных расширений",
  },
  card: {
    requestedAccess: "Запрашиваемый доступ",
    saveConsent: "Сохранить согласие",
    enable: "Включить",
    disable: "Выключить",
  },
  status: {
    active: "Активно",
    installed: "Установлено",
    disabled: "Выключено",
    error: "Ошибка",
  },
  notifications: {
    installed: "Расширение установлено",
    installFailed: "Не удалось установить",
    enabled: "Расширение включено",
    enableFailed: "Не удалось включить",
    disableFailed: "Не удалось выключить",
    removed: "Расширение удалено",
    removeFailed: "Не удалось удалить",
    consentFailed: "Не удалось сохранить согласие",
    operationFailed: "Операция не выполнена",
  },
};
