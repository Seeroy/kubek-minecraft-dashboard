import type { TranslationDictionary } from "../../../locales/types";
import { plural } from "../plural";

const plugins = (n: number) => `${n} ${plural(n, ["плагин", "плагина", "плагинов"])}`;

export const pluginsTranslations: TranslationDictionary = {
  title: "Плагины",
  description: "Установка и управление плагинами сервера",
  notAvailable: {
    title: "Плагины недоступны",
    description: (server: string) => `Плагины работают на ядрах Paper, Purpur и Spigot, а ${server} на другом ядре.`,
    switchTo: (server: string) => `Перейти на ${server}`,
  },
  count: plugins,
  empty: {
    title: "Плагины ещё не установлены",
    description: "Перейдите на вкладку \"Доступные\", чтобы найти плагины и установить их одним кликом",
  },
  searchPlaceholder: "Поиск плагинов Modrinth…",
  catalogEnd: "Больше плагинов для загрузки нет",
  unsupported: "Этот плагин не поддерживается на стороне сервера",
  install: {
    title: "Установить плагин",
    update: "Обновить плагин",
    scheduled: "Установка плагина запланирована",
    updateScheduled: "Обновление плагина запланировано",
    updatesScheduled: (n: number) => `Запланировано обновление: ${plugins(n)}`,
  },
  remove: {
    title: "Удалить плагин",
    description: (name: string) => `Это удалит ${name} с сервера`,
    dependants: "Удалить зависимые плагины",
    dependantsDescription: (names: string) => `Автоматически удалить то, что было установлено как зависимости: ${names}`,
    removed: (file: string) => `Удалён ${file}`,
  },
  upload: {
    progress: "Загрузка плагинов…",
    noJar: "Выберите файлы плагинов в формате .jar",
    done: (n: number) => `Загружено: ${plugins(n)}`,
    partial: (ok: number, fail: number) => `Загружено ${ok}, не удалось ${fail}`,
    drop: "Отпустите .jar файлы для установки",
  },
};
