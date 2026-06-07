import type { en } from "./en";

export const ru: typeof en = {
  common: {
    linkFirst: "🔗 Сначала привяжите аккаунт командой /start",
    error: "❌ Произошла ошибка. Попробуйте ещё раз.",
    unknownCommand:
      "❓ Неизвестная команда. Используйте /help для списка команд.",
  },
  start: {
    welcomeBack: "👋 С возвращением! Ваш Telegram привязан к аккаунту Kubek.",
    welcomeNew:
      "🚀 <b>Добро пожаловать в бота Kubek!</b> 🎮\n\n" +
      "🔗 Чтобы привязать Telegram к аккаунту Kubek, откройте настройки панели, скопируйте OTP-код и отправьте его сюда.",
  },
  help: {
    text:
      "🤖 <b>Команды</b>\n\n" +
      "🚀 /start - привязать или проверить аккаунт\n" +
      "❓ /help - показать это сообщение\n" +
      "🖥️ /servers - список ваших серверов\n" +
      "📊 /status &lt;id&gt; - статус сервера и управление\n" +
      "🌐 /language - сменить язык\n" +
      "🔗 /unlink - отвязать Telegram",
  },
  menu: {
    text: "🎮 <b>Бот Kubek</b>\n\nВыберите действие ниже 👇",
  },
  commands: {
    start: "Привязать или проверить аккаунт",
    help: "Показать команды",
    servers: "Список серверов",
    language: "Сменить язык",
    unlink: "Отвязать аккаунт",
  },
  servers: {
    none: "📭 У вас нет доступных серверов.",
    title: (p) => `🎮 <b>Серверы</b> · страница ${p.page}/${p.total}`,
    fetchError: "❌ Не удалось получить серверы. Попробуйте позже.",
    invalidPage: "❌ Неверный номер страницы.",
  },
  status: {
    usage: "📝 Использование: /status &lt;id_сервера&gt;",
    notFound: "🔍 Сервер не найден.",
    noPermissionView: "🚫 У вас нет прав на просмотр этого сервера.",
    fetchError: "❌ Не удалось получить статус сервера. Попробуйте позже.",
    labels: { status: "Статус", type: "Тип", core: "Ядро", version: "Версия" },
  },
  actions: {
    noPermissionManage: "🚫 У вас нет прав на управление этим сервером.",
    success: (p) => `✅ «${p.name}»: команда ${p.action} отправлена! 🚀`,
    failed: (p) => `❌ Не удалось выполнить ${p.action}. Попробуйте позже.`,
  },
  unlink: {
    notLinked: "🔗 Ваш аккаунт не привязан.",
    done: "🔌 Ваш Telegram отвязан от Kubek.",
  },
  otp: {
    invalid: "❌ Неверный или просроченный OTP-код.",
    accountLinkedElsewhere:
      "❌ Этот аккаунт Kubek уже привязан к другому Telegram.",
    telegramLinkedElsewhere:
      "❌ Этот Telegram уже привязан к другому аккаунту Kubek.",
    success: "✅ Ваш Telegram привязан к аккаунту Kubek! 🎉",
    failed: "❌ Не удалось привязать аккаунт. Попробуйте ещё раз.",
  },
  language: {
    choose: "🌐 Выберите язык:",
    changed: "✅ Язык обновлён.",
  },
  buttons: {
    prev: "◀️ Назад",
    next: "Вперёд ▶️",
    refresh: "🔄 Обновить",
    mainMenu: "🏠 Меню",
    serverList: "📋 Серверы",
    start: "▶️ Запуск",
    stop: "⏹️ Стоп",
    restart: "🔄 Рестарт",
    language: "🌐 Язык",
    createServer: "➕ Новый сервер",
    cancel: "✖️ Отмена",
    confirm: "✅ Создать",
  },
  twofa: {
    request: (p) =>
      `🔐 <b>Запрос на вход</b>\n\n👤 ${p.username}\n🌐 IP: <code>${p.ip}</code>\n🖥️ UA: <code>${p.ua}</code>\n\nПодтвердите или отклоните вход в течение 3 минут.`,
    approve: "✅ Подтвердить",
    deny: "❌ Отклонить",
    approved: "✅ Вход подтверждён",
    denied: "❌ Вход отклонён",
    approvedShort: "✅ Подтверждено",
    deniedShort: "❌ Отклонено",
    serviceUnavailable: "❌ Сервис недоступен",
    errors: {
      not_found: "❌ Запрос не найден",
      expired: "⌛ Запрос истёк",
      denied: "❌ Уже отклонён",
      consumed: "✅ Уже подтверждён",
      approved: "✅ Уже подтверждён",
      forbidden: "🚫 Нет доступа",
      wrong_method: "❌ Неверный метод",
      no_user: "❌ Аккаунт не найден",
      generic: "❌ Ошибка",
    },
  },
  wizard: {
    noPermission: "🚫 У вас нет прав на создание серверов.",
    enterName: "🆕 <b>Новый сервер</b>\n\nОтправьте имя нового сервера:",
    nameEmpty: "❌ Имя не может быть пустым. Отправьте другое:",
    nameTaken: "❌ Сервер с таким именем уже существует. Отправьте другое:",
    chooseBlueprint: "⚙️ Выберите тип сервера:",
    loadingVersions: "⏳ Загрузка версий…",
    noVersions: "❌ Для этого типа сервера сейчас нет доступных версий.",
    chooseVersion: "🏷️ Выберите версию:",
    confirm: (p) =>
      `🧾 <b>Подтверждение</b>\n\n📛 Имя: <b>${p.name}</b>\n⚙️ Тип: ${p.blueprint}\n🏷️ Версия: ${p.version}`,
    creating: "🚀 Создание запущено!",
    cancelled: "✖️ Создание сервера отменено.",
    created: (p) => `✅ Сервер «${p.name}» готов! 🎉`,
    failed: (p) => `❌ Не удалось создать: ${p.error}`,
    progress: (p) =>
      `🚀 Создаётся «${p.name}»…\n<code>${p.bar} ${p.progress}%</code>`,
  },
  statusValues: {
    running: "🟢 Запущен",
    stopped: "🔴 Остановлен",
    starting: "🟡 Запускается",
    stopping: "🟠 Останавливается",
    error: "❌ Ошибка",
    unknown: "⚪ Неизвестно",
  },
  taskNotify: {
    done: "выполнена",
    failed: "завершилась с ошибкой",
    cancelled: "отменена",
    title: (p) => `${p.emoji} Задача «${p.type}» ${p.status}`,
    duration: (p) => `⏱️ Длительность: ${p.value}`,
    server: (p) => `🖥️ Сервер: ${p.name}`,
    plugin: (p) => `🧩 Плагин: ${p.name}`,
    error: (p) => `Ошибка: ${p.message}`,
    units: { ms: "мс", sec: "с", min: "м", hour: "ч" },
  },
};
