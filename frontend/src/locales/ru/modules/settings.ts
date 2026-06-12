import type { TranslationDictionary } from "../../../locales/types";

export const settingsTranslations: TranslationDictionary = {
  header: {
    title: "Настройки панели",
    description: "Настройка глобальных предпочтений панели, безопасности и интеграций",
  },
  general: {
    colorTheme: {
      title: "Цветовая тема",
      description: "Выберите цветовую схему для приложения"
    },
    language: {
      title: "Язык",
      description: "Выберите предпочитаемый язык",
      placeholder: "Выберите язык"
    },
    notifications: {
      title: "Уведомления",
      description: "Персональные настройки уведомлений в этом браузере",
      sound: {
        label: "Звук уведомлений",
        description: "Проигрывать звук при появлении уведомления, если вкладка свёрнута или в фоне"
      }
    },
    panelConfiguration: {
      title: "Конфигурация панели",
      description: "Основные настройки панели и сетевая конфигурация",
      port: {
        label: "Порт панели",
        description: "Порт, на котором будет доступна панель"
      }
    },
    ftp: {
      title: "FTP сервис",
      description: "Настройка доступа к файлам по FTP",
      enable: {
        label: "Включить FTP сервис",
        description: "Разрешить доступ к файлам по протоколу FTP"
      },
      username: "Имя пользователя FTP",
      password: "Пароль FTP",
      passwordPlaceholder: "Введите пароль",
      port: "Порт FTP",
      connectionDetails: {
        title: "Детали подключения FTP",
        description: "Используйте эти данные для подключения с внешним FTP клиентом",
        host: "Хост",
        port: "Порт",
        username: "Имя пользователя",
        password: "Ваш пароль панели",
        instructions: "Используйте внешний FTP клиент (например FileZilla, WinSCP или Cyberduck) для подключения с использованием имени пользователя и пароля панели. FTP сервер предоставляет доступ к файлам вашего сервера, организованным по ID сервера"
      }
    }
  },
  security: {
    title: "Настройки безопасности",
    description: "Настройка контроля доступа и сетевых ограничений",
    subnets: {
      label: "Ограничение доступа по подсетям",
      description: "Ограничить доступ к определенным IP подсетям",
      allowed: "Разрешенные подсети",
      add: "Добавить подсеть",
      example: "например, 192.168.1.0/24",
      empty: {
        title: "Подсети не настроены",
        description: "Добавьте подсети для ограничения доступа"
      }
    },
    telemetry: {
      title: "Телеметрия",
      description: "Анонимная статистика использования и диагностика",
      toggleLabel: "Отправлять анонимную статистику",
      toggleDescriptionStart: "Отключите, чтобы перестать отправлять данные. Также можно принудительно отключить через",
      toggleDescriptionEnd: "переменную окружения"
    }
  },
  telegram: {
    title: "Telegram бот",
    beta: "Бета",
    description: "Настройка уведомлений через Telegram бота",
    enable: {
      label: "Включить Telegram бота",
      description: "Получать уведомления через Telegram бота"
    },
    token: {
      label: "Токен бота",
      placeholder: "Введите токен вашего бота",
      help: "Получите это от @BotFather в Telegram"
    },
    botInfo: {
      title: "Информация о боте",
      validating: "Проверка токена...",
      valid: "Токен действителен",
      error: "Не удалось получить информацию о боте"
    },
    linking: {
      title: "Связывание аккаунта Telegram",
      generateOtp: "Сгенерировать OTP",
      otp: {
        code: "Код OTP:",
        expiresIn: "Истекает через:",
        unit: "секунд",
        help: "Отправьте этот код вашему Telegram боту для связывания аккаунта"
      }
    },
    users: {
      title: "Авторизованные пользователи Telegram",
      loading: "Загрузка связанных пользователей...",
      table: {
        avatar: "Аватар",
        username: "Имя пользователя",
        telegramId: "ID Telegram",
        createdAt: "Создано",
        createdBy: "Создано",
        actions: "Действия",
        remove: "Удалить"
      },
      empty: {
        title: "Пользователи еще не связаны",
        description: "Пользователи могут связать свои аккаунты используя OTP выше"
      }
    }
  },
  users: {
    title: "Учетные записи пользователей",
    description: "Управление всеми учетными записями пользователей и их разрешениями",
    add: "Добавить пользователя",
    empty: {
      title: "Пользователи не найдены",
      description: "Создайте первого пользователя для начала управления доступом к серверам и разрешениями",
      create: "Создать первого пользователя"
    }
  },
  accountCard: {
    admin: "Админ",
    serverAccess: "Доступ к серверам: ",
    noServers: "Серверы не разрешены",
    allServers: "Все серверы",
    permissions: "Разрешения",
    noPermissions: "Разрешения не назначены",
    edit: "Редактировать",
    delete: "Удалить"
  },
  tabs: {
    general: "Общее",
    security: "Безопасность",
    telegram: "Telegram",
    users: "Пользователи",
    sessions: "Сессии",
    about: "О панели"
  },
  about: {
    info: {
      tagline: "Панель управления игровыми серверами с открытым исходным кодом",
      checking: "Проверка обновлений…",
      upToDate: "Установлена актуальная версия",
      updateAvailable: "Доступно обновление",
      updateCta: "Открыть релиз",
      checkFailed: "Не удалось проверить обновления",
      links: {
        github: "Репозиторий",
        releases: "Все релизы",
        issues: "Сообщить о проблеме"
      }
    },
    changelog: {
      header: {
        kicker: "Обновления",
        title: "История изменений",
        description: "Последние релизы из репозитория на GitHub"
      },
      latest: "Актуальная",
      prerelease: "Пре-релиз",
      viewOnGithub: "Открыть на GitHub",
      empty: "Релизы пока не опубликованы",
      error: "Не удалось загрузить историю изменений",
      retry: "Повторить"
    }
  },
  sessions: {
    header: {
      kicker: "Безопасность",
      title: "Активные сессии",
      description: "Устройства, которые сейчас авторизованы в вашем аккаунте",
    },
    buttons: {
      signOutOther: "Выйти из других сессий",
      revoke: "Отозвать",
    },
    notifications: {
      revoked: "Сессия отозвана",
      revokeOthers: "Все другие сессии отозваны",
    },
    labels: {
      thisDevice: "Это устройство",
      ip: "IP",
      unknown: "неизвестно",
      unknownDevice: "Неизвестное устройство",
      unknownOs: "Неизвестная ОС",
      justNow: "только что",
      lastSeen: "Последняя активность",
      created: "Создана",
    },
    empty: "Активных сессий нет",
  },
  notifications: {
    settingsSaved: "Настройки успешно сохранены",
    userCreated: "Пользователь создан",
    userUpdated: "Пользователь обновлён",
    userDeleted: "Пользователь удалён",
  },
  twoFactorTab: {
    loading: "Загрузка…",
    header: {
      kicker: "Двухфакторная аутентификация",
      title: "Двухфакторная аутентификация",
      description: "Дополнительная защита входа через TOTP-приложение или Telegram",
    },
    totp: {
      title: "TOTP-приложение",
      enabled: "включено",
      disabled: "отключено",
      description: "Google Authenticator, 1Password, Authy и другие RFC 6238-совместимые.",
      disable: "Отключить",
      connect: "Подключить",
    },
    telegram: {
      title: "Подтверждение через Telegram",
      enabled: "включено",
      disabled: "отключено",
      available: "Бот пришлёт запрос с кнопками Подтвердить / Отклонить",
      unavailable: "Сначала привяжите Telegram-аккаунт во вкладке Telegram.",
    },
    primary: {
      label: "Основной способ",
      hint: "Используется по умолчанию при входе.",
    },
    notifications: {
      kicker: "Уведомления",
      title: "Уведомления о задачах",
      description: "Отправлять результаты выполнения задач планировщика в Telegram",
      toggleLabel: "Уведомлять о задачах",
      available: "Сообщения о завершённых задачах придут в привязанный Telegram-аккаунт",
      unavailable: "Сначала привяжите Telegram-аккаунт во вкладке Telegram.",
    },
    setupDialog: {
      title: "Подключение TOTP",
      description: "Отсканируйте QR-код в приложении-аутентификаторе и введите 6-значный код.",
      manualHint: "Если не получается отсканировать - введите ключ вручную:",
      codeLabel: "Код из приложения",
      cancel: "Отмена",
      confirm: "Подтвердить",
    },
    disableDialog: {
      title: "Отключить TOTP",
      description: "Подтвердите действие паролем.",
      passwordLabel: "Пароль",
      cancel: "Отмена",
      disable: "Отключить",
    },
    toasts: {
      setupFailed: "Не удалось начать настройку",
      totpEnabled: "TOTP включён",
      invalidCode: "Неверный код",
      totpDisabled: "TOTP отключён",
      invalidPassword: "Неверный пароль",
      telegramEnabled: "Telegram-2FA включён",
      telegramDisabled: "Telegram-2FA отключён",
      toggleFailed: "Не удалось изменить настройку",
      saveFailed: "Не удалось сохранить",
    },
  },
  buttons: {
    save: "Сохранить изменения",
    saving: "Сохранение...",
    saved: "Сохранено!",
    error: "Ошибка!",
    invalidHint: "Не все поля заполнены верно"
  },
  loading: "Загрузка настроек...",
  themes: {
    default: "По умолчанию",
    amber: "Янтарный",
    amethyst: "Аметист",
    cosmicNight: "Космическая ночь",
    mocha: "Мокко",
    green: "Эмеральд"
  },
  validation: {
    ftp: {
      usernameRequired: "Имя пользователя требуется при включенном FTP",
      passwordRequired: "Пароль требуется при включенном FTP",
      portRequired: "Порт требуется при включенном FTP",
      portRange: "Порт должен быть между 1 и 65535"
    },
    subnets: {
      required: "Требуется хотя бы одна подсеть при включенном ограничении",
      itemRequired: "Подсеть не может быть пустой",
      itemInvalid: "Введите корректную подсеть в нотации CIDR (например, 192.168.0.0/24)"
    },
    telegram: {
      tokenRequired: "Токен требуется при включенном Telegram боте"
    },
    port: {
      required: "Порт требуется",
      range: "Порт должен быть между 1 и 65535"
    }
  }
};