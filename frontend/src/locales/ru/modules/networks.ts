import type { TranslationDictionary } from "../../../locales/types";

function servers(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} сервер`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} сервера`;
  return `${n} серверов`;
}

function lines(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} строка без изменений`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} строки без изменений`;
  return `${n} строк без изменений`;
}

export const networksTranslations: TranslationDictionary = {
  wizard: {
    title: "Новая сеть Velocity",
    beta: "Бета",
    steps: {
      proxy: "Прокси",
      backends: "Серверы",
      velocity: "Velocity",
      options: "Параметры",
      review: "Обзор",
      apply: "Применение",
    },
    hints: {
      proxy: "Прокси, к которому подключаются игроки: новый или уже созданный сервер Velocity",
      backends: "Серверы за прокси: привяжите существующие или создайте новые, каждый настраивается отдельно",
      velocity: "Основные настройки velocity.toml, остальное можно поправить в файлах прокси",
      options: "Как прокси передаёт данные игроков и куда они попадают первыми",
      review: "Пока ничего не записано, проверьте, что изменит панель",
      apply: "Панель создаёт серверы и записывает конфиги",
    },
  },
  proxy: {
    networkName: "Название сети",
    networkNamePlaceholder: "Выживание",
    networkNameHint: "Только для панели: так назовётся сеть и папка с её серверами",
    source: "Прокси",
    new: "Новый прокси",
    existing: "Существующий",
    proxyName: "Имя прокси",
    version: "Версия Velocity",
    noProxies: "Свободных серверов Velocity нет, создайте новый прокси",
  },
  fields: {
    name: {
      empty: "Укажите имя",
      taken: (name: string) => `Сервер "${name}" уже есть в панели`,
      duplicate: (name: string) => `Имя "${name}" уже занято в этой сети`,
    },
    port: {
      label: "Порт",
      hint: "Пусто: панель подберёт свободный",
      auto: (port: number) => `авто, от ${port}`,
      invalid: "Порт от 1 до 65535",
      taken: (owner: string) => `Занят сервером ${owner}`,
      duplicate: "Этот порт уже выбран для другого сервера сети",
    },
    memory: {
      label: "Память",
      unit: "МБ",
      min: (min: number) => `Не меньше ${min} МБ`,
    },
    aikar: {
      label: "Флаги Aikar",
      description: "Оптимизированные настройки сборщика мусора для серверов Minecraft",
    },
    docker: {
      label: "Запуск в Docker",
      description: "Сервер работает в изолированном контейнере",
      unavailable: "Docker недоступен на этом хосте",
    },
  },
  backends: {
    existing: "Привязать существующие серверы",
    noCandidates: "Нет свободных серверов Paper, Purpur, Folia, Fabric или Spigot",
    create: "Создать новые серверы",
    createHint: "У каждого сервера своё имя, ядро, версия, порт и память. Новый сервер берёт настройки предыдущего",
    name: "Имя",
    unnamed: (n: number) => `Сервер ${n}`,
    type: "Тип сервера",
    version: "Версия Minecraft",
    add: "Добавить сервер",
    limit: (n: number) => `За один раз можно создать до ${n} серверов`,
    duplicate: "Дублировать",
    remove: "Убрать",
    needOne: "Выберите или создайте хотя бы один сервер",
    modes: {
      modern: "Modern",
      legacy: "Legacy",
    },
  },
  velocity: {
    existingHint: (name: string) => `Значения прочитаны из velocity.toml сервера ${name}, в файл попадут только изменённые`,
    reset: "Сбросить",
    list: "Список серверов",
    motd: {
      label: "MOTD",
      hint: "Описание в списке серверов, формат MiniMessage: <green>Привет</green>",
    },
    showMaxPlayers: {
      label: "Макс. игроков",
      hint: "Только отображение, лимита у Velocity нет",
    },
    security: "Вход и безопасность",
    onlineMode: {
      label: "Online-mode",
      hint: "Проверка лицензии через Mojang. Бэкенды при этом всегда остаются в offline-mode",
    },
    forceKeyAuthentication: {
      label: "Проверка ключей чата",
      hint: "Требовать подписанные ключи игроков, как в обычном сервере 1.19+",
    },
    preventClientProxyConnections: {
      label: "Блокировать VPN",
      hint: "Кикать игрока, если его IP не совпадает с тем, что видит Mojang. Слабая защита, бывают ложные срабатывания",
    },
    kickExistingPlayers: {
      label: "Выкидывать дубль",
      hint: "При повторном входе с того же аккаунта выкидывать уже подключённого игрока",
    },
    offlineWarning: "Без online-mode кто угодно сможет зайти под любым ником, включая администраторов",
    connections: "Соединения",
    ms: "мс",
    compressionThreshold: {
      label: "Порог сжатия",
      hint: "Размер пакета в байтах, с которого он сжимается. -1 отключает сжатие",
    },
    loginRatelimit: {
      label: "Пауза между входами",
      hint: "Сколько ждать между подключениями с одного IP, 0 отключает",
    },
    connectionTimeout: {
      label: "Таймаут подключения",
      hint: "Сколько ждать ответа бэкенда при подключении",
    },
    readTimeout: {
      label: "Таймаут чтения",
      hint: "Через сколько тишины соединение считается оборванным",
    },
    extra: "Дополнительно",
    failoverOnUnexpectedServerDisconnect: {
      label: "Переносить при падении",
      hint: "Если бэкенд упал, отправить игрока на следующий сервер из списка вместо отключения",
    },
    haproxyProtocol: {
      label: "PROXY protocol",
      hint: "Для работы за HAProxy или TCPShield. Без них игроки не смогут подключиться",
    },
    announceForge: {
      label: "Объявлять Forge",
      hint: "Сообщать клиентам, что сеть поддерживает моды",
    },
    acceptsTransfers: {
      label: "Принимать трансферы",
      hint: "Разрешить переход игроков с других серверов пакетом Transfer (1.20.5+)",
    },
    logPlayerConnections: {
      label: "Логировать подключения",
      hint: "Писать в консоль входы, выходы и переходы между серверами",
    },
    queryEnabled: {
      label: "Query",
      hint: "Отвечать на запросы GameSpy 4, нужен мониторингам серверов",
    },
  },
  options: {
    mode: "Передача данных игроков",
    auto: "Авто",
    autoHint: "Панель выберет лучший режим, который поддерживают все серверы",
    modern: "Modern",
    modernHint: "Данные игрока подписаны секретом, подделать их нельзя. Для 1.13+",
    legacy: "Legacy",
    legacyHint: "Формат BungeeCord без подписи. Для Spigot и версий до 1.13",
    unavailable: "Не поддерживается выбранными серверами",
    unsupported: "Не все серверы поддерживают этот режим",
    explain: {
      title: "Чем отличаются modern и legacy",
      how: {
        label: "Как работает",
        modern: "Прокси передаёт ник, UUID, IP и скин в собственном пакете Velocity, подписанном общим секретом",
        legacy: "Те же данные дописываются в первый пакет подключения, как в BungeeCord, без подписи",
      },
      security: {
        label: "Защита",
        modern: "Бэкенд проверяет подпись: без секрета зайти напрямую под чужим ником нельзя",
        legacy: "Бэкенд верит любому. Кто достучится до его порта, зайдёт под любым ником, даже админа",
      },
      versions: {
        label: "Версии",
        modern: "Minecraft 1.13 и новее",
        legacy: "Любые, включая 1.8-1.12",
      },
      servers: {
        label: "Ядра",
        modern: "Paper, Purpur, Folia, Fabric через FabricProxy-Lite",
        legacy: "Spigot и все ядра выше, кроме Fabric",
      },
      firewall: {
        label: "Порты бэкендов",
        modern: "Лучше закрыть снаружи, но утечка не критична",
        legacy: "Обязательно закрыть снаружи, иначе сеть беззащитна",
      },
      summary: "Если все серверы поддерживают modern, выбирайте его. Legacy нужен только для Spigot и старых версий",
    },
    order: "Порядок подключения",
    orderHint: "Игроки попадают на первый сервер, следующие подхватят их, если он недоступен",
    default: "По умолчанию",
    inTry: "В списке try",
    up: "Выше",
    down: "Ниже",
    newServer: "Новый",
  },
  review: {
    loading: "Считаем изменения",
    failed: "Не удалось подготовить изменения",
    retry: "Повторить",
    files: "Файлы",
    created: "новый файл",
    updated: "изменён",
    skipped: (n: number) => lines(n),
    restart: (n: number) => `Перезапуск нужен: ${servers(n)}`,
    binding: "Мастер не меняет server-ip и проброс портов, оставьте бэкенды доступными только для прокси",
    notes: {
      new_server: (name: string, port: number) => `${name} будет создан на порту ${port}`,
      install_fabric_proxy: (name: string) => `На ${name} будет установлен FabricProxy-Lite`,
      legacy_forced: (names: string) => `${names} поддерживает только legacy, вся сеть переходит на него`,
      legacy_insecure: "Legacy доверяет любому, кто подключится к бэкенду напрямую",
    },
  },
  apply: {
    running: "Настраиваем сеть",
    done: "Сеть готова",
    failed: "Не удалось настроить сеть",
    restartTitle: "Перезапустите, чтобы применить",
    restartText: "Эти серверы запущены и прочитают новые конфиги только после перезапуска",
    restartAll: "Перезапустить все",
    restart: "Перезапустить",
    restarted: "Перезапуск",
  },
  actions: {
    next: "Далее",
    back: "Назад",
    cancel: "Отмена",
    create: "Создать сеть",
    creating: "Создаём",
    done: "Готово",
    close: "Закрыть",
  },
  tab: {
    title: "Сеть Velocity",
    emptyTitle: "Прокси не входит в сеть",
    emptyText: "Привяжите к нему бэкенды через мастер сети",
    createNetwork: "Создать сеть",
    members: (n: number) => servers(n),
    mode: (mode: string) => `Форвардинг ${mode}`,
    secret: "Секрет форвардинга",
    secretHint: (hint: string) => `заканчивается на ${hint}`,
    secretNone: "ещё не создан",
    rotate: "Новый секрет",
    rotateTitle: "Создать новый секрет форвардинга?",
    rotateText: "Прокси и все бэкенды получат новый секрет, запущенные серверы нужно перезапустить",
    addServer: "Добавить сервер",
    addPlaceholder: "Выберите сервер",
    noCandidates: "Нет свободных серверов для этой сети",
    remove: "Убрать из сети",
    removeTitle: (name: string) => `Убрать ${name} из сети?`,
    removeText: "Прокси перестанет отправлять туда игроков. Настройки форвардинга на самом сервере останутся",
    deleteNetwork: "Забыть сеть",
    deleteTitle: (name: string) => `Забыть сеть ${name}?`,
    deleteText: "Панель удалит сеть, файлы серверов останутся как есть",
    address: "Адрес",
    alias: "Имя в Velocity",
    loadFailed: "Не удалось загрузить сеть",
    saved: "Сеть обновлена",
    adding: (name: string) => `Добавляем ${name}`,
  },
  badge: {
    proxy: (name: string) => `Прокси сети ${name}`,
    member: (name: string) => `В сети ${name}`,
  },
  errors: {
    NETWORK_NOT_FOUND: "Сеть уже удалена",
    NETWORK_PROXY_INVALID: "Прокси должен быть сервером Velocity",
    NETWORK_SERVER_TAKEN: "Один из серверов уже входит в сеть",
    NETWORK_BACKEND_UNSUPPORTED: "Один из серверов не может работать за Velocity",
    NETWORK_MODE_CONFLICT: "У этих серверов нет общего режима: Fabric нужен modern, Spigot нужен legacy",
    NETWORK_NO_FREE_PORT: "Для новых серверов не осталось свободных портов",
    NETWORK_ORDER_INVALID: "В порядке подключения есть сервер не из сети",
    NETWORK_NAME_TAKEN: (name: string) => `Сервер с именем "${name}" уже есть, выберите другое имя`,
    NETWORK_PORT_TAKEN: (port: string) => `Порт ${port} уже занят другим сервером`,
    nameTaken: "Сервер с таким именем уже есть",
    generic: "Что-то пошло не так",
  },
};
