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
    text: (p: { assistant?: boolean }) =>
      "🤖 <b>Команды</b>\n\n" +
      "🚀 /start - привязать или проверить аккаунт\n" +
      "❓ /help - показать это сообщение\n" +
      "🖥️ /servers - список ваших серверов\n" +
      "📊 /status &lt;id&gt; - статус сервера и управление\n" +
      "🌐 /language - сменить язык\n" +
      (p.assistant ? "🆕 /new - новый чат с ИИ-ассистентом\n" : "") +
      "🔗 /unlink - отвязать Telegram" +
      (p.assistant ? "\n\n💬 Любое другое сообщение уходит ИИ-ассистенту, если он включён в панели. Можно присылать фото и текстовые файлы вроде конфигов и логов" : ""),
  },
  menu: {
    text: "🎮 <b>Бот Kubek</b>\n\nВыберите действие ниже 👇",
  },
  commands: {
    new: "Новый чат с ИИ-ассистентом",
    start: "Привязать или проверить аккаунт",
    help: "Показать команды",
    servers: "Список серверов",
    language: "Сменить язык",
    unlink: "Отвязать аккаунт",
    status: "Статус сервера по id",
  },
  servers: {
    none: "📭 У вас нет доступных серверов.",
    title: (p) => `🎮 <b>Серверы</b> · страница ${p.page}/${p.total}`,
    fetchError: "❌ Не удалось получить серверы. Попробуйте позже.",
    invalidPage: "❌ Неверный номер страницы.",
    columns: { name: "Сервер", status: "Статус", version: "Версия" },
  },
  status: {
    usage: "📝 Использование: /status &lt;id_сервера&gt;",
    notFound: "🔍 Сервер не найден.",
    noPermissionView: "🚫 У вас нет прав на просмотр этого сервера.",
    fetchError: "❌ Не удалось получить статус сервера. Попробуйте позже.",
    labels: {
      status: "Статус",
      type: "Тип",
      core: "Ядро",
      version: "Версия",
      started: "Запущен",
    },
  },
  actions: {
    noPermissionManage: "🚫 У вас нет прав на управление этим сервером.",
    success: (p) => `✅ "${p.name}": команда ${p.action} отправлена! 🚀`,
    failed: (p) => `❌ Не удалось выполнить ${p.action}. Попробуйте позже.`,
  },
  unlink: {
    notLinked: "🔗 Ваш аккаунт не привязан.",
    done: "🔌 Ваш Telegram отвязан от Kubek.",
  },
  otp: {
    invalid: "❌ Неверный или просроченный OTP-код.",
    tooMany: (p) =>
      `⛔ Слишком много неверных кодов. Попробуйте через ${p.minutes} мин.`,
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
    openRelease: "🔗 Открыть релиз",
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
    open: "Открыть",
    copyAddress: "📋 Адрес",
    copyId: "🆔 ID",
    openStatus: "📊 Статус",
    retry: "🔁 Повторить",
  },
  security: {
    notMe: "🚫 Это не я",
    confirm:
      "⚠️ Завершить все сессии этого аккаунта? Тот, кто вошёл, будет выкинут, вы тоже. Потом смените пароль в панели",
    confirmRevoke: "🚫 Выйти везде",
    revoked: "✅ Все сессии завершены. Смените пароль в панели",
    kept: "Ничего не изменилось",
    notOwner: "Это может сделать только владелец аккаунта",
  },
  backupRetry: {
    started: (p) => `🔁 Бэкап "${p.name}" запущен заново`,
    noPermission: "🚫 У вас нет прав создавать бэкапы на этом сервере",
    notFound: "Бэкапа уже нет, создайте новый в панели",
    failed: (p) => `❌ Не удалось повторить: ${p.error}`,
  },
  twofa: {
    request: (p) =>
      `🔐 <b>Запрос на вход</b>\n\n👤 ${p.username}\n🌐 IP: <code>${p.ip}</code>\n🖥️ UA: <code>${p.ua}</code>\n\nПодтвердите или отклоните вход в течение 3 минут.`,
    title: "🔐 Запрос на вход",
    hint: "Подтвердите или отклоните вход в течение 3 минут.",
    labels: { account: "Аккаунт", ip: "IP", browser: "Браузер", time: "Время" },
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
    namePlaceholder: "Имя сервера",
    chooseBlueprint: "⚙️ Выберите тип сервера:",
    loadingVersions: "⏳ Загрузка версий…",
    noVersions: "❌ Для этого типа сервера сейчас нет доступных версий.",
    chooseVersion: "🏷️ Выберите версию:",
    confirm: (p) =>
      `🧾 <b>Подтверждение</b>\n\n📛 Имя: <b>${p.name}</b>\n⚙️ Тип: ${p.blueprint}\n🏷️ Версия: ${p.version}`,
    creating: "🚀 Создание запущено!",
    cancelled: "✖️ Создание сервера отменено.",
    created: (p) => `✅ Сервер "${p.name}" готов! 🎉`,
    failed: (p) => `❌ Не удалось создать: ${p.error}`,
    progress: (p) =>
      `🚀 Создаётся "${p.name}"…\n<code>${p.bar} ${p.progress}%</code>`,
  },
  notify: {
    serverStatus: (p) => `🖥️ <b>${p.name}</b>: ${p.status}`,
    serverError: (p) => `🚨 <b>${p.name}</b>: ошибка <code>${p.error}</code>`,
    lowTps: (p) => `🐢 <b>${p.name}</b> лагает: TPS <code>${p.tps}</code>`,
    login: (p) =>
      `🔐 Вход в аккаунт <b>${p.username}</b> с <code>${p.ip}</code>`,
    backupOps: {
      create: "создание",
      upload: "выгрузку",
      restore: "восстановление",
    },
    backupFailed: (p) =>
      `💾 <b>${p.name}</b>: не удалось выполнить ${p.op} бэкапа <b>${p.backup}</b>\n<code>${p.error}</code>`,
    storageUnreachable: (p) =>
      `☁️ Хранилище <b>${p.name}</b> недоступно\n<code>${p.error}</code>`,
    locked: (p) =>
      `⛔ Слишком много неудачных попыток входа с <code>${p.ip}</code>. Попытки заблокированы на ${p.minutes} мин`,
    updateAvailable: (p) =>
      `🆕 Вышел Kubek <b>${p.version}</b>, у вас ${p.current}`,
  },
  statusValues: {
    running: "🟢 Запущен",
    stopped: "🔴 Остановлен",
    starting: "🟡 Запускается",
    stopping: "🟠 Останавливается",
    crashed: "💥 Упал",
    error: "❌ Ошибка",
    unknown: "⚪ Неизвестно",
  },
  taskNotify: {
    done: "выполнена",
    failed: "завершилась с ошибкой",
    cancelled: "отменена",
    title: (p) => `${p.emoji} Задача "${p.type}" ${p.status}`,
    labels: {
      server: "🖥️ Сервер",
      plugin: "🧩 Плагин",
      duration: "⏱️ Длительность",
      finishedAt: "🕒 Завершена",
    },
    units: { ms: "мс", sec: "с", min: "м", hour: "ч" },
  },
  assistant: {
    unavailable: "🤖 ИИ-ассистент выключен в настройках панели.",
    busy: "⏳ Ассистент ещё отвечает. Дождитесь ответа или нажмите \"Остановить\".",
    pending: "☝️ Сначала подтвердите или отмените действие выше.",
    newChat: "🆕 Новый чат. Просто напишите, что нужно.",
    stopped: "⏹ Остановлено",
    stepLimit: "⚠️ Достигнут лимит шагов, напишите сообщение, чтобы продолжить.",
    failed: (p: { error: string }) => `❌ ${p.error}`,
    stop: "⏹ Остановить",
    toolsTitle: "🛠 Действия",
    confirmTitle: "✋ <b>Нужно ваше подтверждение</b>",
    onServer: (p: { name: string }) => `На сервере <b>${p.name}</b>`,
    approve: "✅ Выполнить",
    deny: "✖️ Отмена",
    approved: "✅ Подтверждено",
    denied: "✖️ Отменено",
    alreadyDecided: "Это действие уже решено",
    planTitle: "📋 <b>План, нужно ваше одобрение</b>",
    approvePlan: "✅ Выполнить план",
    declinePlan: "✖️ Отклонить",
    planApproved: "✅ План одобрен",
    planDeclined: "✖️ План отклонён",
    questionTitle: "❓ <b>Вопрос ассистента</b>",
    questionHint: "Ответьте сообщением",
    questionHintOptions: "Выберите вариант или ответьте сообщением",
    skipQuestion: "⏭ Пропустить",
    questionSkipped: "⏭ Пропущено",
    answered: (p: { answer: string }) => `💬 Ответ: ${p.answer}`,
    newFile: "новый файл",
    unset: "не задано",
    fileTooLarge: (p: { name: string }) => `❌ ${p.name}: файл слишком большой`,
    fileUnsupported: (p: { name: string }) =>
      `❌ ${p.name}: прикрепить можно картинки и текстовые файлы вроде конфигов и логов`,
    tools: {
      list_servers: "Список серверов",
      get_server: "Сведения о сервере",
      get_metrics: "Нагрузка",
      power: "Запуск, остановка, перезапуск",
      read_console: "Чтение консоли",
      search_logs: "Поиск по логам",
      get_diagnostics: "Диагностика",
      send_command: "Команда в консоль",
      list_files: "Список файлов",
      read_file: "Чтение файла",
      write_file: "Изменение файла",
      get_properties: "Чтение server.properties",
      set_properties: "Изменение server.properties",
      list_content: "Установленные плагины и моды",
      search_modrinth: "Поиск на Modrinth",
      install_content: "Установка с Modrinth",
      list_backups: "Список бэкапов",
      create_backup: "Создание бэкапа",
      list_scheduled_tasks: "Задачи планировщика",
      create_scheduled_task: "Новая задача",
      list_players: "Игроки",
      manage_player: "Управление игроком",
      web_search: "Поиск в интернете",
      update_plan: "План",
      ask_user: "Вопрос",
      read_url: "Чтение страницы",
    },
  },
};
