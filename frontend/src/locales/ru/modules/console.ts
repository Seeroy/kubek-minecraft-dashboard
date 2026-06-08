import type { TranslationDictionary } from "../../../locales/types";

export const consoleTranslations: TranslationDictionary = {
  commandInput: {
    placeholder: "Введите команду",
  },
  header: {
    kicker: "Консоль",
    title: "Консоль сервера",
    description: "Просматривайте логи в реальном времени и выполняйте команды на выбранном сервере",
  },
  console: {
    noServerSelected: "Сервер не выбран",
    noLogs: "Логов пока нет. Логи сервера появятся здесь",
    cards: {
      address: "Адрес",
      copyAddress: "Скопировать адрес",
      version: "Версия",
      players: "Игроки",
      playersOnline: "Игроков онлайн",
      serverEmpty: "Сервер пуст",
      status: "Статус",
      uptime: "Аптайм",
      lastUpdate: "Обновлено",
      bufferedLogs: "Буфер логов",
    },
    status: {
      online: "Онлайн",
      offline: "Офлайн",
      running: "Запущен",
      stopped: "Остановлен",
      active: "Активен",
      inactive: "Неактивен",
      starting: "Запускается",
      restarting: "Перезапускается",
      stopping: "Останавливается",
      error: "Ошибка",
      crashed: "Аварийно завершился",
      unknown: "Неизвестно",
    },
  },
  kubekLogLine: {
    notSpecified: "Не указано",
    unknownUser: "Неизвестный пользователь",
    badges: {
      telegram: "Telegram",
      kubek: "Kubek",
    },
    userInput: {
      executedCommand: " выполнил команду: ",
      labels: {
        user: "👤 Пользователь:",
        id: "🆔 ID:",
        exactTime: "🕒 Точное время:",
      },
    },
    statusChange: {
      statusChanged: "Статус сервера изменен: ",
      labels: {
        status: "📊 Статус:",
        exactTime: "🕒 Точное время:",
      },
    },
    stop: {
      serverStopped: "Сервер остановлен",
      exitCode: "(код выхода: ",
      labels: {
        cause: "🛑 Причина:",
        exitCode: "🔢 Код выхода:",
        exactTime: "🕒 Точное время:",
      },
    },
    restartFailed: {
      failedToRestart: "Не удалось перезапустить сервер после ",
      attempts: " попыток",
      labels: {
        attempts: "⚠️ Попытки:",
        exactTime: "🕒 Точное время:",
      },
    },
    botControl: {
      controlledViaTelegram: " управлял сервером через Telegram: ",
      labels: {
        user: "👤 Пользователь:",
        userId: "🆔 ID пользователя:",
        telegramId: "🤖 Telegram ID:",
        action: "🎮 Действие:",
        exactTime: "🕒 Точное время:",
      },
    },
  },
};
