import type { TranslationDictionary } from "../../../locales/types";

export const logViewerTranslations: TranslationDictionary = {
  header: {
    title: "Просмотр логов",
    description: "Логи сервера, включая архивные .log.gz",
  },
  list: {
    title: "Файлы",
    empty: "Логи не найдены",
    gz: "GZ",
    sizeBytes: (size: number) => `${ size } Б`,
    refresh: "Обновить",
  },
  content: {
    title: "Содержимое",
    noSelection: "Выберите файл слева, чтобы просмотреть",
    loading: "Загружается...",
    tailHint: (n: number) => `Показаны последние ${ n } строк(и)`,
    fullFile: "Весь файл",
    tail: (n: number) => `Хвост: ${ n }`,
  },
  search: {
    placeholder: "Поиск по строке...",
    matches: (count: number) => `${ count } совпадений`,
    nothingFound: "Ничего не найдено",
  },
  noServer: "Сначала выберите сервер",
};
