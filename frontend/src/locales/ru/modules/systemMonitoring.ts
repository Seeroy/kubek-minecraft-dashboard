import type { TranslationDictionary } from "../../../locales/types";

export const systemMonitoringTranslations: TranslationDictionary = {
  header: {
    title: "Мониторинг системы",
    description: "Обзор системных ресурсов и производительности в реальном времени",
  },
  dashboard: {
    loadError: "Не удалось загрузить данные мониторинга системы",
  },
  cpu: {
    title: "Использование CPU",
    noData: "Данные использования CPU недоступны",
    overallUsage: "Общее использование",
    usageOverTime: "Использование со временем",
    tooltip: "Использование CPU",
  },
  ram: {
    title: "Использование RAM",
    noData: "Данные использования RAM недоступны",
    memoryUsage: "Использование памяти",
    used: "использовано",
    free: "свободно",
    total: "Всего",
    usedLabel: "Использовано",
    available: "Доступно",
    swapUsage: "Использование swap",
    usageOverTime: "Использование со временем",
    tooltip: "Использование RAM",
  },
  disk: {
    used: "Использовано",
    usedPercent: "использовано",
    free: "свободно",
    available: "Доступно",
    total: "Всего",
  },
  systemInfo: {
    title: "Информация о системе",
    noData: "Информация о системе недоступна",
    hostname: "Имя хоста",
    platform: "Платформа",
    architecture: "Архитектура",
    release: "Релиз",
    uptime: "Время работы",
    cpuModel: "Модель CPU",
    cpuCores: "Ядра CPU",
  },
  hook: {
    fetchError: "Не удалось получить данные мониторинга системы",
  },
  window: {
    now: "Сейчас",
    "1h": "1 час",
    "6h": "6 часов",
    "12h": "12 часов",
    "24h": "24 часа",
  },
  history: {
    kicker: "История",
    title: "Использование ресурсов",
    description: "CPU и RAM за выбранный период",
    cpu: "ЦП",
    ram: "ОЗУ",
    noData: "Нет данных",
    loading: "Загрузка истории...",
  },
};