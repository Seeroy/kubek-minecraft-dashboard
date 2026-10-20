import type { TranslationDictionary } from "../../../locales/types";

export const javaManagerTranslations: TranslationDictionary = {
  header: {
    kicker: "Рантайм",
    title: "Менеджер Java",
    description: "Управление установленными версиями Java и их использованием на серверах",
  },
  available: {
    title: "Доступные версии Java",
    description: "Установить дополнительные версии Java из Adoptium",
    versionLabel: (version: string) => `Версия ${ version }`,
    installed: "Установлено",
  },
  installed: {
    title: "Установленные версии Java",
    description: "Версии Java доступны для использования вашими серверами",
    empty: {
      title: "Версии Java не установлены",
      description: "Перейдите на вкладку \"Доступные\" для установки версий Java",
    },
    badge: "Установлено",
    vendor: (vendor: string) => `Поставщик: ${ vendor }`,
    runtime: (runtime: string) => `Среда выполнения: ${ runtime }`,
    usage: (count: number) => `Используется ${ count } сервер${ count === 1 ? "ом" : "ами" }`,
  },
  serverUsage: {
    title: "Использование Java серверами",
    description: "Версии Java, используемые вашими серверами",
    empty: {
      title: "Серверы не настроены",
      description: "Создайте серверы, чтобы увидеть использование версий Java",
    },
    versionLabel: (version: string, isManaged: boolean) => `Java ${ version } ${ isManaged ? "(Управляемая)" : "(Системная)" }`,
    managed: "Управляемая",
    system: "Системная",
    custom: "Кастомная",
  },
  custom: {
    add: {
      title: "Добавить кастомную Java",
      description: "Зарегистрируйте установку Java из любой локальной папки",
      path: "Путь",
      pathPlaceholder: "/путь/к/java или папке установки",
      name: "Название (необязательно)",
      namePlaceholder: "Например, GraalVM 21",
      validate: "Проверить",
      submit: "Добавить",
      validOk: (version: string, vendor: string) => `Найдена Java ${ version }${ vendor ? ` (${ vendor })` : "" }`,
      validFail: "По этому пути не найдена рабочая Java",
    },
    list: {
      title: "Зарегистрированные кастомные Java",
      description: "Эти установки можно выбрать для любого сервера",
      badge: "Кастомная",
      empty: {
        title: "Кастомные Java не зарегистрированы",
        description: "Добавьте локальную установку Java через форму выше",
      },
    },
    notifications: {
      added: "Кастомная Java добавлена",
      removed: "Кастомная Java удалена",
    },
    errors: {
      addFailed: "Не удалось добавить кастомную Java",
      removeFailed: "Не удалось удалить кастомную Java",
    },
  },
  tabs: {
    installed: (count: number) => `Установленные (${ count })`,
    available: (count: number) => `Доступные (${ count })`,
    custom: (count: number) => `Кастомные (${ count })`,
    serverUsage: (count: number) => `Использование серверами (${ count })`,
  },
  buttons: {
    refreshing: "Обновление",
    refresh: "Обновить",
  },
  notifications: {
    installStarted: (version: string) => `Установка Java ${ version } начата`,
    installMessage: "Вы можете отслеживать прогресс в панели задач",
    deleteSuccess: (version: string) => `Java ${ version } успешно удалена`,
  },
  errors: {
    loadFailed: "Не удалось загрузить версии Java",
    installFailed: "Не удалось начать установку Java",
    deleteFailed: "Не удалось удалить версию Java",
    deleteInUseTitle: "Невозможно удалить версию Java",
    deleteInUseMessage: "Эта версия в настоящее время используется одним или несколькими серверами",
  },
};