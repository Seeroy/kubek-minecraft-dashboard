import type { TranslationDictionary } from "../../../locales/types";
import { plural } from "../plural";

export const serverTypesTranslations: TranslationDictionary = {
  title: "Типы серверов",
  description: "Устанавливайте типы серверов (blueprint) и управляйте ими",
  refresh: "Обновить",
  tabs: {
    installed: "Установленные",
    catalog: "Каталог",
    view: "Вид каталога",
    cards: "Карточки",
    table: "Таблица",
  },
  catalog: {
    otherOs: "Не для этой ОС",
    steps: {
      exec: "Запускает команды",
      steamcmd: "SteamCMD",
      script: "Запускает скрипт",
    },
    hostStepsHint: "При установке запускает программы на хосте панели",
    details: {
      about: "Сервер",
      game: "Игра",
      runtime: "Где запускается",
      native: "Напрямую на хосте",
      docker: "В Docker",
      platforms: "ОС",
      anyOs: "Любая",
      notThisOs: "не эта ОС",
      install: "Что делает при установке",
      tags: "Теги",
      stepNames: {
        download: "Скачивает файлы",
        writeFile: "Создаёт файлы",
        chmod: "Меняет права файлов",
        template: "Пишет конфиг по шаблону",
        script: "Запускает скрипт",
        exec: "Запускает команды",
        steamcmd: "Ставит через SteamCMD",
        dockerPull: "Скачивает Docker-образ",
      },
    },
  },
  notice: {
    title: "Код блюпринтов выполняется без изоляции",
    description:
      "Устанавливаемые блюпринты исполняют свой код в процессе панели без песочницы. Ставьте только из доверенных источников. Установка доступна только администраторам.",
  },
  upload: {
    title: "Загрузите blueprint .kbp или .json",
    hint: "Перетащите файл сюда или выберите вручную",
    choose: "Выбрать файл",
    installing: "Установка...",
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
    updated: (name: string) => `Тип сервера ${name} обновлён`,
    removed: (name: string) => `Тип сервера ${name} удалён`,
  },
};
