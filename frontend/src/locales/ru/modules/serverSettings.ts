import type { TranslationDictionary } from "../../../locales/types";

export const serverSettingsTranslations: TranslationDictionary = {
  header: {
    title: "Настройки сервера",
    description: "Управление игровым процессом, сетью и конфигурацией сервера",
  },
  tabs: {
    general: "Общее",
    java: "Java",
    information: "Информация",
    gameplay: "Игровой процесс",
    world: "Мир",
    network: "Сеть",
    other: "Другое",
    reset: "Сброс",
    saveChanges: "Сохранить изменения",
    saving: "Сохранение...",
    saved: "Сохранено!",
    error: "Ошибка!",
  },
  modal: {
    title: "Требуется перезапуск сервера",
    description:
      "Настройки вашего сервера были сохранены успешно, но некоторые изменения вступят в силу только после перезапуска сервера",
    question:
      "Хотите ли вы перезапустить сервер сейчас? Вы можете перезапустить его позже из панели управления сервером",
    restartLater: "Перезапустить позже",
    restartNow: "Перезапустить сервер сейчас",
  },
  general: {
    noServerSelected: "Сервер не выбран",
    basicInformation: {
      title: "Основная информация",
      description: "Имя сервера и визуальная идентичность",
      serverIcon: "Иконка сервера",
      uploadIcon: "Загрузить иконку",
      uploading: "Загрузка...",
      recommendedFormat: "Рекомендуемый формат: PNG 64x64",
      serverName: "Имя сервера",
      serverNamePlaceholder: "Введите имя сервера",
    },
    performanceSettings: {
      title: "Настройки производительности",
      description: "Распределение памяти и параметры запуска",
      startupArguments: "Аргументы запуска",
      startupArgumentsPlaceholder: "-Xmx2G",
      startupArgumentsHelp:
        "Добавьте аргументы JVM для распределения памяти и настройки производительности",
    },
    autoRestartSettings: {
      title: "Настройки авто-перезапуска",
      description: "Автоматическое восстановление после сбоя",
      enableAutoRestart: "Включить авто-перезапуск",
      enableAutoRestartDescription:
        "Автоматически перезапускать сервер при сбое",
      maxRestartAttempts: "Максимальное количество попыток перезапуска",
      maxRestartAttemptsHelp:
        "Количество попыток перезапуска перед прекращением",
    },
    coreSettings: {
      title: "Ядро сервера",
      description: "Сменить ядро (движок) и версию, на которых работает сервер",
      core: "Ядро",
      version: "Версия",
      currentCore: "Текущее ядро",
      chooseCore: "Выберите ядро",
      chooseVersion: "Выберите версию",
      loadingVersions: "Загрузка версий...",
      noVersions: "Нет доступных версий",
      apply: "Сменить ядро",
      applying: "Применение...",
      mustBeStopped: "Остановите сервер перед сменой ядра",
      confirmTitle: "Сменить ядро сервера?",
      confirmDescription:
        "Выбранное ядро будет загружено, а server.jar заменён. Миры и конфиги сохранятся, но плагины/моды могут быть несовместимы с новым ядром.",
      confirmAction: "Загрузить и применить",
      cancel: "Отмена",
      started: "Смена ядра запущена",
      failed: "Не удалось сменить ядро",
      customDropzone: "Перетащите файл .jar сюда или выберите его вручную",
      customSelected: ({ name }: { name: string }) => `Выбран файл: ${name}`,
    },
    stopConfiguration: {
      title: "Конфигурация остановки",
      description: "Как правильно остановить сервер",
      customCommand: "Пользовательская команда",
      customCommandDescription:
        "Отправить определенную команду для остановки сервера",
      ctrlCSignal: "Сигнал Ctrl+C",
      ctrlCSignalDescription:
        "Отправить сигнал прерывания (рекомендуется для большинства серверов)",
      stopCommand: "Команда остановки",
      stopCommandPlaceholder: "stop",
      stopCommandHelp: "Команда для отправки при остановке сервера",
    },
  },
  java: {
    noServerSelected: "Сервер не выбран",
    title: "Конфигурация Java",
    description: "Выберите версию Java или используйте системную Java",
    javaVersion: "Версия Java",
    javaBinaryPath: "Путь к бинарному файлу Java",
    javaBinaryPathPlaceholder: "C:/Java/bin/java.exe или /usr/bin/java",
    javaBinaryPathHelp: "Укажите полный путь к исполняемому файлу Java",
    save: "Сохранить",
  },
  information: {
    serverInformation: {
      title: "Информация о сервере",
      description: "Базовая конфигурация сервера и настройки отображения",
      motd: "Сообщение дня (MOTD)",
      motdPlaceholder: "Введите приветственное сообщение вашего сервера",
      maxPlayers: "Максимум игроков",
    },
    securitySettings: {
      title: "Настройки безопасности",
      description: "Контроль доступа к серверу и аутентификация",
      onlineMode: "Онлайн режим",
      onlineModeDescription: "Проверять аутентификацию игроков через Mojang",
      whitelist: "Белый список",
      whitelistDescription:
        "Разрешить присоединяться только игрокам из белого списка",
    },
  },
  gameplay: {
    gameRules: {
      title: "Правила игры",
      description: "Настройка основных механик игры",
      difficulty: "Сложность",
      difficultyOptions: {
        peaceful: "Мирный",
        easy: "Легкий",
        normal: "Нормальный",
        hard: "Трудный",
      },
      defaultGamemode: "Режим игры по умолчанию",
      gamemodeOptions: {
        survival: "Выживание",
        creative: "Творческий",
        adventure: "Приключение",
        spectator: "Наблюдатель",
      },
    },
    playerInteractions: {
      title: "Взаимодействия игроков",
      description: "Контроль взаимодействия игроков с миром и друг с другом",
      pvp: "PvP",
      pvpDescription: "Разрешить бой игрок против игрока",
      allowFlight: "Разрешить полет",
      allowFlightDescription: "Разрешить игрокам летать в режиме выживания",
    },
    worldSettings: {
      title: "Настройки мира",
      description: "Защита мира и настройки режима игры",
      hardcoreMode: "Хардкор режим",
      hardcoreModeDescription: "Игроки банятся при смерти",
      spawnProtectionRadius: "Радиус защиты спавна",
      spawnProtectionRadiusHelp:
        "Блоки от спавна, где только операторы могут строить",
    },
  },
  world: {
    worldGeneration: {
      title: "Генерация мира",
      description: "Настройка создания мира и параметров terrain",
      worldSeed: "Сид мира",
      worldSeedPlaceholder: "Оставьте пустым для случайного сида",
      maxWorldSize: "Максимальный размер мира",
      maxWorldSizeHelp: "Максимальный радиус границы мира в блоках",
      generateStructures: "Генерировать структуры",
      generateStructuresDescription: "Деревни, храмы и т.д",
    },
    performanceSettings: {
      title: "Настройки производительности",
      description: "Оптимизация рендеринга мира и симуляции",
      viewDistance: "Дистанция видимости",
      viewDistanceHelp: "Чанки (2-32)",
      simulationDistance: "Дистанция симуляции",
      simulationDistanceHelp: "Чанки (3-32)",
    },
    dimensionSettings: {
      title: "Настройки измерений",
      description: "Управление доступными измерениями и функциями",
      allowNether: "Разрешить Nether",
      allowNetherDescription: "Включить измерение Nether",
    },
    spawnSettings: {
      title: "Настройки спавна",
      description: "Контроль поведения спавна сущностей",
      spawnAnimals: "Спавнить животных",
      spawnAnimalsDescription: "Коровы, свиньи, курицы и т.д",
      spawnMonsters: "Спавнить монстров",
      spawnMonstersDescription: "Зомби, скелеты, криперсы и т.д",
      spawnNpcs: "Спавнить NPC",
      spawnNpcsDescription: "Деревенские жители",
    },
  },
  network: {
    connectionSettings: {
      title: "Настройки подключения",
      description: "Настройка портов сервера и сетевой связности",
      serverPort: "Порт сервера",
      serverPortDefault: "По умолчанию: 25565",
      queryPort: "Порт Query",
      queryPortDefault: "По умолчанию: 25565",
    },
    networkConfiguration: {
      title: "Сетевая конфигурация",
      description: "Важные заметки о сетевых настройках",
      importantNotice: "Важное замечание",
      importantNoticeText:
        "Изменение сетевых настроек может потребовать перезапуска сервера. Убедитесь, что вы настроили брандмауэр и перенаправление портов соответственно. Если вы измените порт сервера, игроки должны подключаться с использованием нового порта",
    },
  },
  other: {
    customProperties: {
      title: "Пользовательские свойства",
      description:
        "Дополнительные свойства сервера, не включенные в основные категории",
      propertyNamePlaceholder: "имя-свойства",
      propertyValuePlaceholder: "значение свойства",
      addProperty: "Добавить свойство",
    },
    aboutServerProperties: {
      title: "О свойствах сервера",
      description: "Понимание конфигурации пользовательских свойств",
      advancedConfiguration: "Расширенная конфигурация",
      advancedConfigurationText:
        'Эти свойства соответствуют непосредственно файлу server.properties. Изменения, сделанные здесь, будут сохранены в этот файл при нажатии "Сохранить изменения". Модифицируйте эти настройки с осторожностью, поскольку они могут повлиять на стабильность сервера',
    },
    advancedSettings: {
      title: "Расширенные настройки",
      description: "Продолжайте с осторожностью",
      warning: "Предупреждение",
      warningText:
        "Это расширенные свойства сервера. Неправильные значения могут вызвать отказ сервера в запуске или неожиданное поведение. Модифицируйте свойства только если вы знаете, что они делают",
    },
  },
  notifications: {
    selectImageFile: "Пожалуйста, выберите файл изображения",
    serverIconUploaded: "Иконка сервера загружена успешно",
    failedToUploadIcon: "Не удалось загрузить иконку",
    settingUpdated: "Настройка обновлена успешно",
    failedToUpdateSetting: "Не удалось обновить настройку",
    failedToLoadProperties: "Не удалось загрузить свойства сервера",
    serverRestartInitiated: "Перезапуск сервера инициирован",
    failedToRestartServer: "Не удалось перезапустить сервер",
    settingsSaved:
      "Настройки сохранены успешно. Перезапустите сервер позже, чтобы применить все изменения",
    settingsReset: "Настройки сброшены к сохраненным значениям",
    failedToResetSettings: "Не удалось сбросить настройки",
    noServerSelected: "Сервер не выбран",
    failedToSaveProperties: "Не удалось сохранить свойства сервера",
    javaSettingsUpdated: "Настройки Java обновлены",
    failedToUpdateJavaSettings: "Не удалось обновить настройки Java",
  },
  status: {
    saving: "Сохранение...",
    saved: "Сохранено!",
    error: "Ошибка",
  },
};
