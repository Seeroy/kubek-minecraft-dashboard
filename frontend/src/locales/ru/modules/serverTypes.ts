import type { TranslationDictionary } from "../../../locales/types";

export const serverTypesTranslations: TranslationDictionary = {
  header: {
    kicker: "Типы серверов",
    title: "Типы серверов",
    description: "Устанавливайте типы серверов (blueprint) и управляйте ими",
  },
  upload: {
    hint: "Загрузите blueprint .kbp или .json",
    choose: "Выбрать файл",
  },
  securityNotice: {
    title: "Код блюпринтов выполняется без изоляции",
    description: "Устанавливаемые блюпринты исполняют свой код в процессе панели без песочницы (alpha). Ставьте только из доверенных источников. Установка доступна только администраторам.",
  },
  list: {
    loading: "Загрузка",
    empty: "Нет установленных типов серверов",
  },
  source: {
    bundled: "встроенный",
    installed: "установленный",
  },
  notifications: {
    installed: "Тип сервера установлен",
    installFailed: "Не удалось установить",
    installError: "Не удалось установить blueprint",
    removed: "Тип сервера удалён",
    removeFailed: "Не удалось удалить",
    removeError: "Не удалось удалить blueprint",
  },
};
