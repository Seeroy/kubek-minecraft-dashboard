import type { TranslationDictionary } from "../../../locales/types";

export const notificationsTranslations: TranslationDictionary = {
  serverStatus: {
    started: "Экземпляр теперь запущен",
    stopped: "Экземпляр был остановлен",
    startedTitle: (name: string) => `Сервер «${name}» запущен`,
    stoppedTitle: (name: string) => `Сервер «${name}» остановлен`,
    crashedTitle: (name: string) => `Сервер «${name}» завершился с ошибкой`,
    crashed: {
      message: "Экземпляр вышел неожиданно. Проверьте логи для деталей",
      action: "Перейти в консоль",
    },
  },
  globalErrorNotifier: {
    goToServerSettings: "Перейти в настройки сервера",
    goToBackups: "Перейти в резервные копии",
    goToFiles: "Перейти в файлы",
    goToPlugins: "Перейти в плагины",
    restart: "Перезапустить",
  },
  tasks: {
    steps: {
      searchingCore: "Поиск последней сборки…",
      downloadingCore: "Загрузка ядра сервера…",
      checkingJava: "Подготовка среды выполнения Java…",
      downloadingJava: "Загрузка среды выполнения Java…",
      unpackingJava: "Распаковка среды выполнения Java…",
      creatingBat: "Завершение скриптов запуска…",
      completed: "Завершение настройки…",
    },
    plugin: {
      installing: "Установка",
      updating: "Обновление",
      removing: "Удаление",
      viaModrinth: "через Modrinth…",
      removed: "удален",
      ready: "готов",
      removeMessage: "Плагин был удален с сервера",
      installMessage: "Плагин был успешно установлен",
      failed: "не удалось",
      failedSuffix: "не удалось",
      errorMessage:
        "Что-то пошло не так при взаимодействии с Modrinth. Проверьте логи и повторите",
    },
    backup: {
      creating: "Создание",
      restoring: "Восстановление",
      deleting: "Удаление",
      backupEllipsis: "резервной копии...",
      completed: "завершено",
      deleteMessage: "Резервная копия была удалена",
      successMessage: "Операция завершена успешно",
      errorMessage: "Что-то пошло не так во время операции с резервной копией",
      createInProgressTitle: (name: string) =>
        `Создание резервной копии сервера ${name}`,
      restoreInProgressTitle: (name: string) =>
        `Восстановление резервной копии сервера ${name}`,
      deleteInProgressTitle: (name: string) =>
        `Удаление резервной копии сервера ${name}`,
      inProgressMessage: "Операция выполняется в фоне…",
      createdTitle: (name: string) => `Резервная копия сервера ${name} создана`,
      restoredTitle: (name: string) =>
        `Резервная копия сервера ${name} восстановлена`,
      deletedTitle: (name: string) => `Резервная копия сервера ${name} удалена`,
      createFailedTitle: (name: string) =>
        `Не удалось создать резервную копию сервера ${name}`,
      restoreFailedTitle: (name: string) =>
        `Не удалось восстановить резервную копию сервера ${name}`,
      deleteFailedTitle: (name: string) =>
        `Не удалось удалить резервную копию сервера ${name}`,
    },
    java: {
      installing: "Установка",
      runtimeEllipsis: "среды выполнения Java…",
      installed: "установлено",
      successMessage: "Среда выполнения Java была успешно установлена",
      installFailed: "установка не удалась",
      errorMessage:
        "Что-то пошло не так при установке Java. Проверьте логи и повторите",
    },
    server: {
      creating: "Создание",
      server: "сервера",
      ready: "готов",
      openMessage: "Откройте вид сервера прямо сейчас",
      openAction: "Открыть сервер",
      createFailed: "создание не удалось",
      errorMessage:
        "Подготовка была прервана. Проверьте логи и попробуйте снова",
      changingCore: "Смена ядра для",
      coreChanged: "- ядро изменено",
      coreChangeMessage: "Новое ядро установлено",
      coreChangeFailed: "- смена ядра не удалась",
      coreChangeErrorMessage:
        "Смена ядра была прервана. Проверьте логи и попробуйте снова",
    },
    defaultProgress: "Подготовка вашего сервера…",
  },
  updateAvailable: {
    title: "Доступно обновление",
    message: (version: string, notes: string) => `Доступна версия ${version}`,
    viewRelease: "Посмотреть релиз",
  },
};
