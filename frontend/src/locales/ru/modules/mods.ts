import type { TranslationDictionary } from "../../../locales/types";
import { plural } from "../plural";

const mods = (n: number) => `${n} ${plural(n, ["мод", "мода", "модов"])}`;

export const modsTranslations: TranslationDictionary = {
  title: "Моды",
  description: "Установка и управление модами сервера",
  notAvailable: {
    title: "Моды недоступны",
    description: (server: string) => `Моды работают на серверах с загрузчиком Fabric, а ${server} на другом ядре.`,
    switchTo: (server: string) => `Перейти на ${server}`,
  },
  count: mods,
  empty: {
    title: "Моды ещё не установлены",
    description: "Перейдите на вкладку \"Доступные\", чтобы найти моды и установить их одним кликом",
  },
  searchPlaceholder: "Поиск модов Modrinth…",
  catalogEnd: "Больше модов для загрузки нет",
  unsupported: "Этот мод не поддерживается на стороне сервера",
  install: {
    title: "Установить мод",
    update: "Обновить мод",
    scheduled: "Установка мода запланирована",
    updateScheduled: "Обновление мода запланировано",
    updatesScheduled: (n: number) => `Запланировано обновление: ${mods(n)}`,
  },
  remove: {
    title: "Удалить мод",
    description: (name: string) => `Это удалит ${name} с сервера`,
    dependants: "Удалить зависимые моды",
    dependantsDescription: (names: string) => `Автоматически удалить то, что было установлено как зависимости: ${names}`,
    removed: (file: string) => `Удалён ${file}`,
  },
  upload: {
    progress: "Загрузка модов…",
    noJar: "Выберите файлы модов в формате .jar",
    done: (n: number) => `Загружено: ${mods(n)}`,
    partial: (ok: number, fail: number) => `Загружено ${ok}, не удалось ${fail}`,
    drop: "Отпустите .jar файлы для установки",
  },
};
