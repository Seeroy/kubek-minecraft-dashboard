import type { TranslationDictionary } from "../../../locales/types";

export const whatsNewTranslations: TranslationDictionary = {
  title: "Kubek обновлён",
  subtitle: "Вот что появилось в этой версии",
  gotIt: "Понятно",
  fullChangelog: "Все изменения на GitHub",
  releases: {
    "4-0-1": {
      docker: "Запуск серверов в Docker-контейнерах",
      builtinCores: "Встроенные ядра теперь работают в Docker",
      pty: "Эмулятор терминала PTY с подсказками сервера",
      customCore: "Загрузка своего ядра в настройках сервера",
      sidebar: "Доработана логика боковой панели",
    },
  },
};
