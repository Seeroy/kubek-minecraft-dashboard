import type { TranslationDictionary } from "../../../locales/types";

export const filesTranslations: TranslationDictionary = {
  header: {
    title: "Файловый менеджер",
    description: "Просмотр, редактирование и управление файлами сервера",
  },
  modals: {
    confirmDialog: {
      defaultTitle: "Вы уверены?",
      confirmText: "Подтвердить",
      cancelText: "Отмена",
    },
    newDirectory: {
      title: "Создать новую директорию",
      description: "Введите имя для новой директории в",
      form: {
        directoryName: {
          label: "Имя директории",
          placeholder: "Новая папка",
        },
        submit: {
          default: "Создать директорию",
          loading: "Создание...",
        },
      },
      cancel: "Отмена",
    },
    newFile: {
      title: "Создать новый файл",
      description: "Введите имя для нового файла в",
      form: {
        fileName: {
          label: "Имя файла",
          placeholder: "новыйфайл.txt",
        },
        submit: {
          default: "Создать файл",
          loading: "Создание...",
        },
      },
      cancel: "Отмена",
    },
    editor: {
      title: "Редактировать файл",
      cancel: "Отмена",
      viewInLogViewer: "Посмотреть в Log Viewer",
      save: {
        default: "Сохранить",
        loading: "Сохранение...",
      },
    },
    createArchive: {
      title: "Создать архив",
      description: ({ count }: { count: number }) => `Создать ZIP из ${ count } выбранных элементов`,
      form: {
        name: {
          label: "Имя архива",
          placeholder: "archive",
        },
      },
      preview: {
        label: "Будет включено:",
        more: ({ count }: { count: number }) => `… и ещё ${ count }`,
      },
      submit: "Создать",
      cancel: "Отмена",
    },
  },
  ui: {
    files: {
      noServerSelected: "Пожалуйста, выберите сервер для просмотра файлов",
      buttons: {
        createFile: "Создать файл",
        createFolder: "Создать папку",
        upload: "Загрузить",
      },
      delete: {
        title: "Удалить",
        description: "Вы уверены, что хотите удалить",
        confirmText: "Удалить",
        cancelText: "Отмена",
        undoWarning: "Это действие нельзя отменить",
        confirmManyTitle: ({ count }: { count: number }) => `Удалить ${ count } элементов?`,
        confirmManyDesc: "Это действие нельзя отменить",
      },
      selection: {
        count: ({ count }: { count: number }) => `Выбрано: ${ count }`,
        actions: {
          delete: "Удалить",
          archive: "Создать архив",
        },
      },
      dropzone: {
        hint: "Отпустите файлы для загрузки",
      },
      tips: {
        button: "Подсказки",
        title: "Подсказки и горячие клавиши",
        click: "клик",
        multiSelect: "Выбор нескольких файлов",
        rangeSelect: "Выбор диапазона",
        archive: "Упаковать выбранные файлы в ZIP-архив",
        dragUpload: "Перетащите файлы в окно для загрузки",
      },
    },
    filesList: {
      loading: "Загрузка файлов...",
      searchPlaceholder: "Поиск файлов...",
      noMatches: "Ничего не найдено",
      search: {
        placeholderAll: "Поиск по всем файлам...",
        scope: {
          folder: "В папке",
          all: "Везде",
        },
        found: ({ count }: { count: number }) => `Найдено: ${ count }`,
        empty: ({ query }: { query: string }) => `По запросу «${ query }» ничего не найдено`,
      },
      empty: {
        title: "Файлы не найдены",
        subtitle: "Эта директория пуста",
        description: "В этой директории не найдено файлов или папок",
        hint: "Создайте новый файл или папку, чтобы начать",
      },
      table: {
        headers: {
          name: "Имя",
          size: "Размер",
          modified: "Изменен",
        },
      },
    },
    fileItem: {
      actions: {
        edit: "Редактировать",
        download: "Скачать",
        copyPath: "Копировать путь",
        delete: "Удалить",
        extract: "Распаковать",
        openInLogViewer: "Открыть в Log Viewer",
      },
    },
  },
  notifications: {
    success: {
      directoryCreated: "Директория создана успешно",
      fileCreated: "Файл создан успешно",
      fileSaved: "Файл сохранен успешно",
      fileUploaded: "Файл загружен успешно",
      fileDownloaded: "Файл скачан успешно",
      pathCopied: "Путь скопирован в буфер обмена",
      deleted: "удален успешно",
      batchDeleted: "Элементы удалены",
      archiveCreated: "Архив создан",
      archiveExtracted: "Архив распакован",
      uploadedMany: ({ count }: { count: number }) => `Загружено файлов: ${ count }`,
    },
    error: {
      operationFailed: "Операция не выполнена",
      loadFiles: "Не удалось загрузить файлы",
      readFile: "Не удалось прочитать файл",
      saveFile: "Не удалось сохранить файл",
      createDirectory: "Не удалось создать директорию",
      createFile: "Не удалось создать файл",
      uploadFile: "Не удалось загрузить файл",
      downloadFile: "Не удалось скачать файл",
      delete: "Не удалось удалить",
      batchDelete: "Не удалось удалить выбранное",
      archiveCreate: "Не удалось создать архив",
      archiveExtract: "Не удалось распаковать архив",
      uploadSome: ({ ok, fail }: { ok: number; fail: number }) => `Загружено ${ ok }, не удалось ${ fail }`,
      cannotEditFile: "Этот тип файла нельзя открыть в текстовом редакторе",
    },
    progress: {
      deleting: "Удаление файлов…",
      archiving: "Создание архива…",
      extracting: "Распаковка архива…",
      uploading: "Загрузка файлов…",
    },
  },
};