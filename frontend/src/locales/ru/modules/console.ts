import type { TranslationDictionary } from "../../../locales/types";
import { plural } from "../plural";

export const consoleTranslations: TranslationDictionary = {
  explainPrompt: (line: string) => `Объясни эту ошибку консоли и как её исправить:\n\n\`\`\`\n${line}\n\`\`\``,
  noServer: {
    title: "Сервер не выбран",
    description: "Выберите сервер в сайдбаре, чтобы открыть его консоль",
  },
  log: {
    title: "Журнал",
    lines: (n: number) => `${n} ${plural(n, ["строка", "строки", "строк"])}`,
    search: "Фильтр по логу",
    download: "Скачать",
    empty: "Вывода пока нет, строки сервера появятся здесь",
    noMatches: "Нет строк под фильтр",
    newLines: (n: number) => `${n} ${plural(n, ["новая", "новых", "новых"])}`,
  },
  command: {
    placeholder: "Введите команду",
    send: "Отправить",
  },
  cards: {
    address: "Адрес",
    copyAddress: "Скопировать адрес",
    version: "Версия",
    players: "Игроки",
    playersOnline: "Игроки онлайн",
    serverEmpty: "Никого нет",
    status: "Статус",
    uptime: "Аптайм",
    lastUpdate: "Данные получены",
    secondsAgo: (s: number) => (s < 1 ? "только что" : `${s} с назад`),
    bufferedLogs: "Строк в буфере",
  },
  status: {
    running: "Работает",
    stopped: "Остановлен",
    starting: "Запускается",
    stopping: "Останавливается",
    crashed: "Упал",
  },
  events: {
    unknownUser: "Неизвестный пользователь",
    executed: "выполнил команду",
    statusChanged: "Статус сервера изменён на",
    stopped: (code: number) => `Сервер остановлен, код выхода ${code}`,
    restartFailed: (attempts: number) =>
      `Не удалось перезапустить сервер после ${attempts} ${plural(attempts, ["попытки", "попыток", "попыток"])}`,
    telegramControl: "через Telegram:",
    causes: {
      killed: "Остановлен по запросу",
      crashed: "Аварийное завершение",
    },
    details: {
      user: "Пользователь",
      id: "ID",
      telegramId: "Telegram ID",
      action: "Действие",
      status: "Статус",
      cause: "Причина",
      exitCode: "Код выхода",
      attempts: "Попытки",
      time: "Время",
    },
  },
};
