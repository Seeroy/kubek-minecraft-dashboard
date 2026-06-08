import type { TranslationDictionary } from "../../../locales/types";

export const newServerModalTranslations: TranslationDictionary = {
  modal: {
    title: "Создать новый сервер",
    tabs: {
      core: "Ядро",
    },
    buttons: {
      cancel: "Отмена",
      create: "Создать сервер",
      creating: "Создание…",
    },
    notifications: {
      catalogError: "Не удалось загрузить каталог",
      creationFailed: "Не удалось создать сервер",
      creationError: "Что-то пошло не так при создании сервера",
    },
    progress: {
      title: "Создание сервера",
      runningHint: "Можно закрыть окно - создание продолжится в фоне",
      stages: {
        core: "Подготовка ядра",
        java: "Проверка Java",
        finalize: "Завершение",
      },
      buttons: {
        open: "Открыть сервер",
        another: "Создать ещё",
        back: "Назад",
        close: "Закрыть",
      },
    },
  },
  general: {
    title: "Основное",
    parameters: "Параметры",
    name: {
      label: "Имя сервера",
      placeholder: "Мой потрясающий сервер",
      errors: {
        required: "Имя сервера обязательно",
        max: "Имя сервера должно быть менее 50 символов",
        regex: "Имя сервера может содержать только буквы, цифры, пробелы, дефисы и подчеркивания",
      },
    },
    port: {
      label: "Порт сервера",
      errors: {
        range: "Порт должен быть между 1024 и 65535",
      },
    },
  },
  core: {
    version: {
      label: "Версия ядра",
    },
    custom: {
      dropzone: "Перетащите ваш файл `.jar` сюда или просмотрите файлы",
      selected: ({ name }: { name: string }) => `Выбран файл: ${name}`,
    },
  },
  java: {
    version: {
      label: "Версия Java",
      resolving: "Подбираем",
      options: {
        "21": {
          label: "Java 21",
          description: "Последняя версия LTS",
        },
        "17": {
          label: "Java 17",
          description: "Стабильная версия LTS",
        },
        "11": {
          label: "Java 11",
          description: "Версия совместимости",
        },
        "8": {
          label: "Java 8",
          description: "Устаревшая версия",
        },
        system: {
          label: "Системная Java",
          description: "Использовать системную установку Java",
        },
      },
      badges: {
        recommended: "Рекомендуется",
        installed: "Установлена",
      },
    },
  },
  advanced: {
    title: "Дополнительно",
    memory: {
      label: "Память сервера",
      unit: "МБ",
      help: "-Xms - начальный размер кучи, -Xmx - максимальный. Указывается в мегабайтах",
      xms: {
        label: "Начальный размер (Xms)",
      },
      xmx: {
        label: "Максимальный размер (Xmx)",
      },
      errors: {
        range: "Память должна быть от 256 до 1048576 МБ",
        order: "Максимум не может быть меньше начального размера",
      },
    },
    aikar: {
      label: "Флаги Aikar",
      description: "Оптимизированный набор флагов G1GC для стабильной работы сервера. Рекомендуется для большинства серверов",
    },
    startupArguments: {
      label: "Дополнительные аргументы",
      placeholder: "-Dproperty=value",
      help: "Произвольные аргументы JVM. Флаги памяти и Aikar добавляются автоматически - здесь они не нужны",
    },
    preview: {
      label: "Итоговые аргументы запуска",
    },
  },
  blueprint: {
    loadingTypes: "Загрузка типов серверов",
    loadingVersions: "Загрузка версий",
    selectVersion: "Выберите версию",
    selectOption: (label: string) => `Выберите: ${ label }`,
    ports: {
      game: "Игровой порт",
      proxy: "Порт прокси",
    },
  },
};
