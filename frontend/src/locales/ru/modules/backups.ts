import type { TranslationDictionary } from "../../../locales/types";

export const backupsTranslations: TranslationDictionary = {
  page: {
    noServerSelected: "Пожалуйста, выберите сервер для просмотра резервных копий",
    header: {
      kicker: "Бэкапы",
      title: "Управление резервными копиями",
      description: "Создание и управление резервными копиями сервера",
      createButton: "Создать резервную копию",
    },
    loading: "Загрузка резервных копий...",
  },
  table: {
    headers: {
      name: "Имя",
      type: "Тип",
      status: "Статус",
      created: "Создано",
      size: "Размер",
      files: "Файлы",
    },
    actions: {
      download: "Скачать",
      restore: "Восстановить",
      delete: "Удалить",
    },
    types: {
      full: "Полная",
      partial: "Частичная",
    },
  },
  filters: {
    searchPlaceholder: "Поиск резервных копий...",
    status: {
      all: "Все статусы",
      completed: "Завершено",
      creating: "Создание",
      failed: "Не удалось",
      paused: "Приостановлено",
    },
  },
  emptyState: {
    noBackups: {
      title: "Резервных копий пока нет",
      description: "Создайте свою первую резервную копию, чтобы начать управление резервными копиями",
      createButton: "Создать резервную копию",
    },
    noMatches: {
      title: "Резервные копии не найдены",
      description: "Нет резервных копий, соответствующих текущим фильтрам. Попробуйте скорректировать критерии поиска",
    },
  },
  modals: {
    createBackup: {
      title: "Создать новую резервную копию",
      description: "Настройте параметры резервной копии. Резервная копия будет создана в фоновом режиме",
      form: {
        name: {
          label: "Имя резервной копии *",
          placeholder: "Введите имя резервной копии",
        },
        description: {
          label: "Описание",
          placeholder: "Необязательное описание",
        },
        type: {
          label: "Тип резервной копии",
          options: {
            full: "Полная резервная копия",
            partial: "Частичная резервная копия",
          },
        },
        advanced: {
          title: "Расширенные настройки",
          format: {
            label: "Формат",
            options: {
              zip: "ZIP",
              tarGz: "TAR.GZ",
            },
          },
          compressionRatio: {
            label: (value: number) => `Степень сжатия: ${ value }`,
            min: "Быстро (1)",
            max: "Лучше (9)",
          },
          exclusions: {
            label: "Исключить файлы/директории (шаблоны Glob)",
            placeholder: "например, *.log, cache/**, temp/*",
            addButton: "Добавить",
            description: "Используйте шаблоны glob для исключения файлов или директорий из резервной копии. Примеры: *.log (все файлы логов), cache/** (директория кэша и её содержимое)",
          },
        },
        selectionMode: {
          label: "Режим выбора",
          options: {
            all: "Все файлы",
            custom: "Пользовательский выбор",
          },
        },
        fileSelection: {
          label: "Выбрать файлы",
          loading: "Загрузка файлов...",
          selected: "Выбрано",
          count: (count: number) => `${ count } файл(ов) выбрано`,
        },
        buttons: {
          cancel: "Отмена",
          create: "Создать резервную копию",
          creating: "Создание…",
        },
      },
      notifications: {
        loadFilesFailed: "Не удалось загрузить файлы",
        loadFilesFailedMessage: "Не удалось загрузить файлы сервера для выбора",
        noServerSelected: "Сервер не выбран",
        noServerSelectedMessage: "Пожалуйста, выберите сервер перед созданием резервной копии",
        createFailed: "Не удалось создать резервную копию",
        createFailedMessage: "Что-то пошло не так при создании резервной копии",
      },
    },
    backupInfo: {
      types: {
        full: "Полная резервная копия",
        partial: "Частичная резервная копия",
      },
      sections: {
        created: "Создано",
        sizeAndFiles: "Размер и файлы",
        format: "Формат",
        serverId: "ID сервера",
        additionalInfo: "Дополнительная информация",
        backupId: "ID резервной копии:",
        path: "Путь:",
        compressionRatio: "Степень сжатия:",
        compressionRatioValue: (ratio: number) => `${ ratio }/9`,
        excludedPatterns: "Исключенные шаблоны:",
        timestamps: "Временные метки",
        lastUpdated: "Последнее обновление:",
      },
      formats: {
        zip: "ZIP",
        tarGz: "TAR.GZ",
      },
      fileCount: (count: number) => `${ count } файл${ count === 1 ? '' : 'ов' }`,
      lastUpdatedFormat: (date: string, time: string) => `${ date } в ${ time }`,
    },
  },
  notifications: {
    loadFailed: "Не удалось загрузить резервные копии",
    loadFailedMessage: "Не удалось загрузить историю резервных копий",
    downloadFailed: "Скачивание не удалось",
    downloadFailedMessage: "Не удалось скачать файл резервной копии",
    restoreStarted: "Восстановление начато",
    restoreStartedMessage: (name: string) => `Восстановление "${ name }" поставлено в очередь`,
    restoreFailed: "Восстановление не удалось",
    restoreFailedMessage: "Не удалось начать восстановление резервной копии",
    deleteStarted: "Удаление начато",
    deleteStartedMessage: (name: string) => `Удаление "${ name }" поставлено в очередь`,
    deleteFailed: "Удаление не удалось",
    deleteFailedMessage: "Не удалось начать удаление резервной копии",
  },
  validations: {
    nameRequired: "Имя резервной копии обязательно",
    nameMax: "Имя резервной копии должно быть менее 100 символов",
    descriptionMax: "Описание должно быть менее 500 символов",
    typeRequired: "Тип резервной копии обязателен",
    compressionRatioRange: "Степень сжатия должна быть между 1 и 9",
    formatRequired: "Формат обязателен",
    selectionModeRequired: "Режим выбора обязателен",
    exclusionEmpty: "Шаблон исключения не может быть пустым",
    exclusionMax: "Шаблон исключения должен быть менее 200 символов",
    exclusionInvalid: "Шаблон исключения содержит недопустимые символы",
    customSelectionRequired: "Для частичных резервных копий по выбору должен быть выбран хотя бы один файл",
  },
};