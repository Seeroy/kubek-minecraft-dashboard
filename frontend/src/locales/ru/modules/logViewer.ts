import type { TranslationDictionary } from "../../../locales/types";
import { plural } from "../plural";

export const logViewerTranslations: TranslationDictionary = {
  title: "Просмотр логов",
  description: "Логи сервера, включая архивные .log.gz",
  refresh: "Обновить",
  noServer: {
    title: "Сервер не выбран",
    description: "Выберите сервер в сайдбаре",
  },
  files: {
    title: "Файлы",
    search: "Найти файл",
    current: "Текущие",
    archive: "Архив",
    empty: "Логи не найдены",
    noMatches: (query: string) => `Нет файлов с "${query}"`,
    total: (size: string) => `Всего ${size} · папка logs/`,
  },
  viewer: {
    pick: "Выберите файл слева, чтобы просмотреть",
    loading: "Загружается…",
    empty: "Файл пуст",
    search: "Поиск по строке…",
    nothingFound: "Ничего не найдено",
    position: (current: number, total: number) => `${current} / ${total}`,
    prev: "Предыдущее (Shift+Enter)",
    next: "Следующее (Enter)",
    wrap: "Перенос длинных строк",
    download: "Скачать файл",
    lines: (n: number) => `${n.toLocaleString()} ${plural(n, ["строка", "строки", "строк"])}`,
  },
};
