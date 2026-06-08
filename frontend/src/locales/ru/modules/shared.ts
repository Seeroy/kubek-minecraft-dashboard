import type { TranslationDictionary } from "../../../locales/types";

export const sharedTranslations: TranslationDictionary = {
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