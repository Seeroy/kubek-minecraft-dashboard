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
  },
  tabs: {
    installed: (count: number) => `Установленные (${ count })`,
    available: (count: number) => `Доступные (${ count })`,
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