import type { TranslationDictionary } from "../../../locales/types";

export const sharedTranslations: TranslationDictionary = {
  notFound: {
    title: "Страница не найдена",
    description: "Такой страницы в панели нет, ссылка устарела или в ней опечатка",
    home: "На главную",
  },
  crash: {
    title: "Что-то пошло не так",
    description: "Этот раздел упал с ошибкой, попробуйте открыть его снова",
    retry: "Повторить",
    extension: "Ошибка расширения",
  },
  errors: {
    outOfMemory: {
      title: "Серверу не хватило памяти",
      description: "Увеличьте выделенную RAM в настройках сервера или оптимизируйте использование памяти",
      actions: {
        goToServerSettings: "Перейти к настройкам сервера",
      },
    },
    portBindFailed: {
      title: "Не удалось привязаться к порту сервера",
      description: "Проверьте, не используется ли порт другим приложением, или измените порт сервера",
      actions: {
        goToServerSettings: "Перейти к настройкам сервера",
      },
    },
    worldCorruption: {
      title: "Обнаружено повреждение мира",
      description: "Создайте резервную копию мира и попробуйте восстановить его, или восстановите из резервной копии",
      actions: {
        goToBackups: "Перейти к резервным копиям",
        goToFiles: "Перейти к файлам",
      },
    },
    pluginError: {
      title: "Ошибка загрузки или выполнения плагина",
      description: "Проверьте совместимость плагинов, обновите плагины или удалите проблемные плагины",
      actions: {
        goToPlugins: "Перейти к плагинам",
      },
    },
    diskSpace: {
      title: "Недостаточно места на диске",
      description: "Освободите место на диске или переместите сервер в другое место",
    },
    networkError: {
      title: "Проблема с сетевым подключением",
      description: "Проверьте сетевую конфигурацию и настройки firewall",
    },
    configurationError: {
      title: "Ошибка файла конфигурации",
      description: "Проверьте server.properties и другие файлы конфигурации на наличие синтаксических ошибок",
      actions: {
        goToServerSettings: "Перейти к настройкам сервера",
      },
    },
    javaVersionIncompatible: {
      title: "Несовместимая версия Java",
      description: "Обновите Java до совместимой версии для вашего ядра сервера",
      actions: {
        goToServerSettings: "Перейти к настройкам сервера",
      },
    },
    filePermissionError: {
      title: "Ошибка прав доступа к файловой системе",
      description: "Проверьте права доступа к файлам и убедитесь, что сервер имеет права записи в свою директорию",
    },
    modConflict: {
      title: "Конфликт совместимости модов",
      description: "Проверьте совместимость модов, обновите моды или удалите конфликтующие моды",
    },
    unknown: {
      title: "Неизвестная ошибка",
      description: "Произошла неизвестная ошибка",
    },
    serverUnreachable: "Сервер недоступен",
    unexpected: "Непредвиденная ошибка",
    // API error codes, BAD_REQUEST, NOT_FOUND and CONFLICT keep the server's own message
    codes: {
      UNAUTHORIZED: "Сессия истекла, войдите снова",
      FORBIDDEN: "Нет доступа к этому действию",
      INTERNAL_ERROR: "Внутренняя ошибка сервера",
      RATE_LIMITED: "Слишком много попыток, попробуйте позже",
      VALIDATION_ERROR: "Проверьте введённые данные",
      TOTP_LOCKED: "Слишком много попыток, войдите заново",
      TOTP_INVALID: "Неверный код",
      TOTP_SETUP_EXPIRED: "Время настройки истекло, начните заново",
      INVALID_PASSWORD: "Неверный пароль",
      PLAYERS_UNSUPPORTED: "У этого типа сервера нет списков игроков",
      PLAYER_NOT_FOUND: "Аккаунта Minecraft с таким ником нет",
      MOJANG_UNAVAILABLE: "Mojang недоступен, попробуйте позже",
      SERVER_NOT_RUNNING: "Сервер не запущен",
      SERVER_BUSY: "Сервер занят другой операцией, попробуйте чуть позже",
      PLAYERS_NEEDS_STOPPED_SERVER: "Чтобы задать это, остановите сервер",
      PLAYERS_APPLY_TIMEOUT: "Сервер не подтвердил изменение, проверьте консоль",
      UNSAFE_LAUNCH_ARGUMENT: (field?: string) => (field ? `Небезопасное значение в "${field}"` : "Небезопасное значение в аргументах запуска"),
      ASSISTANT_NOT_CONFIGURED: "Ассистент не настроен",
      ASSISTANT_BUSY: "Ассистент ещё отвечает, дождитесь конца ответа",
      ROLE_NAME_TAKEN: "Роль с таким названием уже есть",
      ROLE_BUILTIN: "Встроенную роль нельзя переименовать или удалить",
      ROLE_UNKNOWN: "Одной из выбранных ролей больше нет, обновите список",
      ACCESS_ESCALATION: "Нельзя выдать права выше своих",
    },
  },
  fileSizes: {
    bytes: "Б",
    kilobytes: "Кб",
    megabytes: "Мб",
    gigabytes: "Гб",
    unknown: "?",
  },
  socketStatus: {
    disconnected: "отключен",
    connecting: "подключение",
    connected: "подключен",
    error: "ошибка",
  },
  ui: {
    unknown: "Неизвестно",
  },
};
