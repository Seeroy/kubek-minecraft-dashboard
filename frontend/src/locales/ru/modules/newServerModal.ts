import type { TranslationDictionary } from "../../../locales/types";

export const newServerModalTranslations: TranslationDictionary = {
  modal: {
    title: "Создать новый сервер",
    close: "Закрыть",
    notifications: {
      catalogError: "Не удалось загрузить каталог",
      creationFailed: "Не удалось создать сервер",
      creationError: "Что-то пошло не так при создании сервера",
      nameTaken: "Сервер с таким именем уже существует",
    },
  },
  steps: {
    type: {
      label: "Тип сервера",
      hint: "Выберите ядро, остальное подберём автоматически",
    },
    basics: {
      label: "Основное",
      hint: "Имя, версия и Java",
    },
    advanced: {
      label: "Дополнительно",
      hint: "Память, флаги запуска и EULA",
    },
    create: {
      label: "Создание",
      hint: "Создание сервера",
    },
  },
  nav: {
    back: "Назад",
    next: "Далее",
    create: "Создать сервер",
    creating: "Создание…",
    picked: (name: string) => `Выбрано: ${name}`,
    pickType: "Выберите тип сервера",
    keys: "далее",
    running: "Можно закрыть окно, создание продолжится в фоне",
    another: "Создать ещё",
    done: "Готово",
    openConsole: "Открыть консоль",
  },
  type: {
    modpack: {
      title: "Есть готовая сборка?",
      text: "Импортируйте модпак с Modrinth или файл .mrpack, моды поставятся сами",
      action: "Импорт модпака",
    },
    search: "Найти тип сервера",
    loading: "Загрузка типов серверов",
    nothing: "Ничего не найдено",
    nothingHint: (query: string) => `По запросу "${query}" типов серверов нет`,
  },
  general: {
    parameters: "Параметры",
    name: {
      label: "Имя сервера",
      placeholder: "Мой потрясающий сервер",
      errors: {
        required: "Имя сервера обязательно",
        max: "Имя сервера должно быть менее 50 символов",
        regex: "Имя сервера может содержать только латинские буквы, цифры, пробелы, дефисы и подчеркивания",
      },
    },
    port: {
      label: "Порт сервера",
      free: (port: number) => `Следующий свободный: ${port}`,
      busy: (name: string) => `Порт уже занят сервером "${name}"`,
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
      label: "Файл ядра",
      title: "Перетащите файл .jar сюда",
      hint: "Или выберите его на компьютере",
      choose: "Выбрать файл",
      selected: (name: string) => `Выбран файл: ${name}`,
      required: "Загрузите файл .jar",
      invalid: "Нужен файл .jar",
    },
  },
  java: {
    version: {
      label: "Версия Java",
      loading: "Загрузка версий Java…",
      resolving: "Подбираем подходящую Java…",
      mismatch: (core: string, java: number) => `Для ${core} нужна Java ${java}`,
      tooOld: "Сервер на этой версии не запустится",
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
        custom: "Кастомная",
      },
      manual: {
        option: "Указать путь к Java...",
        placeholder: "/путь/к/java или папке установки",
        apply: "Применить",
        invalid: "По этому пути не найдена рабочая Java",
        applied: "Кастомный путь к Java применён",
      },
    },
  },
  advanced: {
    memory: {
      label: "Память сервера",
      unit: "МБ",
      help: "Xms задаёт начальный размер кучи, Xmx максимальный",
      free: (size: string) => `Свободно на хосте: ${size}`,
      slider: "Максимум памяти",
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
    launch: "Параметры запуска",
    aikar: {
      label: "Флаги Aikar",
      description: "Оптимизированный набор флагов G1GC для стабильной работы сервера. Рекомендуется для большинства серверов",
    },
    docker: {
      label: "Запускать в Docker",
      beta: "Бета",
      description: "Запустить сервер в Docker-контейнере вместо процесса на хосте. Выбор фиксируется при создании сервера",
      unavailable: "Docker-демон недоступен",
    },
    autostart: {
      label: "Запустить после создания",
      description: "Сервер стартует сразу, как только всё будет готово",
    },
    eula: {
      label: "Принять EULA Minecraft",
      description: "Подтверждаю согласие с",
      link: "Minecraft EULA",
      required: "Без принятия EULA сервер Minecraft не запустится",
    },
    folder: {
      label: "Папка в списке",
      none: "Без папки",
    },
    startupArguments: {
      label: "Дополнительные аргументы",
      placeholder: "-Dproperty=value",
      help: "Флаги памяти и Aikar добавляются автоматически",
    },
    preview: {
      label: "Итоговые аргументы запуска",
    },
  },
  progress: {
    stages: {
      java: "Проверка Java",
      core: "Подготовка ядра",
      mods: "Загрузка модов",
      overrides: "Настройки пака",
      finalize: "Завершение",
    },
    pending: "Ожидает",
    done: "Готово",
    overall: "Общий прогресс",
    createdTitle: (name: string) => `Сервер "${name}" создан`,
    starting: "Сервер запускается, следите за ним в консоли",
    ready: "Сервер готов к запуску",
    failedTitle: "Не удалось создать сервер",
  },
  blueprint: {
    loadingVersions: "Загрузка версий",
    selectVersion: "Выберите версию",
    selectOption: (label: string) => `Выберите: ${label}`,
    ports: {
      game: "Игровой порт",
      proxy: "Порт прокси",
    },
  },
};
