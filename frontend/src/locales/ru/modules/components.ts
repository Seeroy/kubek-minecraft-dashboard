import type { TranslationDictionary } from "../../../locales/types";

// 1 изменение не сохранено, 3 изменения не сохранены, 5 изменений не сохранено
const unsavedChanges = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} изменение не сохранено`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} изменения не сохранены`;
  return `${n} изменений не сохранено`;
};

export const componentsTranslations: TranslationDictionary = {
  settings: {
    changed: "изменено",
    unsaved: unsavedChanges,
    reset: "Сбросить",
    save: "Сохранить",
  },
  justNow: "только что",
  duration: {
    days: (d: number, h: number) => `${d}д ${h}ч`,
    hours: (h: number, m: number) => `${h}ч ${m}м`,
    minutes: (m: number) => `${m}м`,
  },
  inputWithHistory: {
    placeholder: "Введите текст",
  },
  secret: {
    saved: "Сохранён, оставьте пустым, чтобы не менять",
    savedHint: (hint: string) => `Сохранён, заканчивается на ${hint}. Оставьте пустым, чтобы не менять`,
    show: "Показать",
    hide: "Скрыть",
  },
  taskStages: {
    kinds: {
      proxy: (name: string) => `Прокси "${name}"`,
      server: (name: string) => `Сервер "${name}"`,
      fabricProxy: (name: string) => `FabricProxy-Lite для "${name}"`,
      networkConfigs: "Конфиги сети и папка",
      downloadPack: "Скачивание модпака",
      readPack: "Проверка файлов пака",
    },
    steps: {
      searchingCore: "Поиск сборки",
      downloadingCore: "Скачивание ядра",
      pullingImage: "Загрузка Docker-образа",
      checkingJava: "Проверка Java",
      downloadingJava: "Скачивание Java",
      unpackingJava: "Распаковка Java",
      creatingBat: "Скрипты запуска",
      completed: "Завершение",
    },
    waiting: "В очереди",
    failed: "Ошибка",
  },
  pageWidth: {
    toggle: "Переключить ширину страницы",
  },
  serverStatus: {
    running: "Запущен",
    stopped: "Остановлен",
    starting: "Запускается",
    stopping: "Останавливается",
    crashed: "Упал",
  },
  statusButton: {
    loading: "Загрузка...",
    success: "Успешно",
    error: "Ошибка",
    idle: "Ожидание",
  },
};
