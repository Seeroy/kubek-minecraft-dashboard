import { plural } from "../plural";

export const dashboardTranslations = {
  header: {
    title: "Дашборд",
    greeting: {
      morning: (name: string) => (name ? `Доброе утро, ${name}` : "Доброе утро"),
      day: (name: string) => (name ? `Добрый день, ${name}` : "Добрый день"),
      evening: (name: string) => (name ? `Добрый вечер, ${name}` : "Добрый вечер"),
      night: (name: string) => (name ? `Доброй ночи, ${name}` : "Доброй ночи"),
    },
    summary: (running: number, total: number, players: number) =>
      `${running} из ${total} ${plural(total, ["сервера", "серверов", "серверов"])} работают · ${players} ${plural(players, ["игрок", "игрока", "игроков"])} онлайн`,
  },
  actions: {
    allServers: "Все серверы",
    createServer: "Создать сервер",
  },
  toolbar: {
    edit: "Настроить",
    done: "Готово",
    reset: "Сбросить",
    addWidget: "Добавить виджет",
    hide: "Скрыть виджет",
  },
  widgets: {
    servers: "Серверы",
    hostLoad: "Нагрузка хоста",
    events: "События",
  },
  overview: {
    title: "Сводка",
    serversOnline: "Серверы онлайн",
    starting: (n: number) => `${n} запускается`,
    players: "Игроки онлайн",
    cpu: "CPU хоста",
    ram: "RAM хоста",
  },
  servers: {
    filter: {
      label: "Фильтр",
      all: "Все",
      running: "Работают",
      offline: "Не в сети",
    },
    columns: {
      server: "Сервер",
      status: "Статус",
      type: "Тип",
      players: "Игроки",
      cpu: "CPU",
      ram: "RAM",
      uptime: "Аптайм",
    },
    empty: "Серверов пока нет",
    emptyFiltered: "Нет серверов с таким статусом",
    start: "Запустить",
    restart: "Перезапустить",
    console: "Консоль",
    memory: (used: string, limit: string) => `${used} / ${limit} ГБ`,
    memoryUsed: (used: string) => `${used} ГБ`,
  },
  hostLoad: {
    range: "Период",
    hour: "1 ч",
    day: "24 ч",
    now: "сейчас",
    note: {
      live: "обновляется каждые 10 с",
      "1h": "среднее за минуту",
      "24h": "среднее за 15 минут",
    },
    start: {
      live: "−6 мин",
      "1h": "−60 мин",
      "24h": "−24 ч",
    },
  },
  events: {
    scheduled: "Запланировано",
    recent: "Недавно",
    empty: "Пока ничего",
  },
  justNow: "только что",
};
