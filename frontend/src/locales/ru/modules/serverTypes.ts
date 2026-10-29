import type { TranslationDictionary } from "../../../locales/types";
import { plural } from "../plural";

export const serverTypesTranslations: TranslationDictionary = {
  title: "Типы серверов",
  description: "Устанавливайте типы серверов (blueprint) и управляйте ими",
  refresh: "Обновить",
  notice: {
    title: "Код блюпринтов выполняется без изоляции",
    description:
      "Устанавливаемые блюпринты исполняют свой код в процессе панели без песочницы. Ставьте только из доверенных источников. Установка доступна только администраторам.",
  },
  upload: {
    title: "Загрузите blueprint .kbp или .json",
    hint: "Перетащите файл сюда или выберите вручную",
    choose: "Выбрать файл",
    installing: "Установка…",
  },
  filters: {
    all: "Все",
    bundled: "Встроенные",
    installed: "Установленные",
    search: "Найти тип сервера",
  },
  source: {
    bundled: "встроенный",
    installed: "установленный",
  },
  features: {
    console: "Консоль",
    backups: "Бэкапы",
    files: "Файлы",
    players: "Игроки",
    "plugins:modrinth": "Плагины",
    "mods:fabric": "Моды",
  },
  meta: {
    runtime: "Запуск",
    portsAndVariables: "Порты · переменные",
    usedBy: "Используется",
    servers: (n: number) => `${n} ${plural(n, ["сервером", "серверами", "серверами"])}`,
    unused: "не используется",
  },
  remove: "Удалить",
  inUse: "Нельзя удалить: тип используется серверами",
  confirmRemove: {
    title: (name: string) => `Удалить тип сервера "${name}"?`,
    description: "Блюпринт пропадёт из мастера создания серверов",
    confirm: "Удалить",
    cancel: "Отмена",
  },
  empty: {
    title: "Ничего не найдено",
    description: "Попробуйте другой запрос",
  },
  toasts: {
    installed: (name: string) => `Тип сервера ${name} установлен`,
    removed: (name: string) => `Тип сервера ${name} удалён`,
  },
};
