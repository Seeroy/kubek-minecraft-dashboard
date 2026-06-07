import type { TranslationDictionary } from "../../../locales/types";

export const pluginsTranslations: TranslationDictionary = {
  dashboard: {
    header: {
      title: "Плагины",
      description: "Установка и управление плагинами сервера",
    },
    states: {
      noServer: {
        title: "Выберите сервер для продолжения",
        description: "Выберите сервер из боковой панели для управления плагинами",
      },
      notAvailable: {
        title: "Плагины недоступны",
        description:
          "Плагины не поддерживаются для серверов Bedrock Edition. Только серверы Java Edition поддерживают плагины",
      },
    },
    tabs: {
      installed: "Установленные",
      available: "Доступные",
    },
    actions: {
      refresh: "Обновить",
      refreshing: "Обновление",
    },
    notifications: {
      loadInstalledFailed: "Не удалось загрузить установленные плагины",
      selectServerFirst: "Выберите сервер перед установкой плагинов",
      missingProjectId: "Не удалось определить идентификатор плагина",
      manualRemoveSuccess: (fileName: string) => `Удален ${ fileName }`,
      manualRemoveFailed: "Не удалось удалить ручной плагин",
    },
  },
  installedTab: {
    kicker: "Плагины",
    title: "Установленные плагины",
    loading: "Загрузка установленных плагинов…",
    emptyTitle: "Плагины еще не установлены",
    emptyDescription:
      "Перейдите на вкладку Доступные, чтобы найти плагины и установить их одним кликом",
    table: {
      headers: {
        name: "Название",
        version: "Версия",
        status: "Статус",
        file: "Файл",
        installed: "Установлен",
      },
    },
  },
  installedCard: {
    badges: {
      update: "Доступно обновление",
      manual: "Ручной",
      dependency: "Зависимость",
    },
    tooltips: {
      updateAvailable: "Доступна более новая версия",
      updateButton: "Доступно обновление",
      reinstallButton: "Переустановить",
      removeButton: "Удалить плагин",
    },
    labels: {
      installedOn: (date: string) => `Установлен ${ date }`,
      installedAt: (timestamp: string) => `Установлен в ${ timestamp }`,
    },
  },
  availableTab: {
    kicker: "Плагины",
    title: "Каталог Modrinth",
    description: "Поиск плагинов, совместимых с Paper & Bukkit, в Modrinth",
    inputPlaceholder: "Поиск плагинов Modrinth…",
    summary: {
      projectsFound: (count: number) =>
        `${ count.toLocaleString() } проект${ count === 1 ? "" : "ов" } найден${ count === 1 ? "" : "о" }`,
      none: "Проекты не найдены",
      showing: (count: number) => `Показывается ${ count.toLocaleString() } результат${ count === 1 ? "" : "ов" }`,
    },
    loading: {
      searching: "Поиск в Modrinth…",
      more: "Загрузка дополнительных плагинов…",
      end: "Больше плагинов для загрузки нет",
    },
    notifications: {
      searchFailed: "Не удалось запросить каталог Modrinth",
    },
    tooltips: {
      disabledInstall: "Выберите сервер для установки этого плагина",
      unsupported: "Этот плагин не поддерживается на стороне сервера",
    },
    buttons: {
      install: "Установить",
    },
    labels: {
      versions: "Версии:",
      downloads: (count: number) => `${ count.toLocaleString() } загрузок`,
      followers: (count: number) => `${ count.toLocaleString() } подписчик${ count === 1 ? "" : "ов" }`,
    },
  },
  catalogCard: {
    badges: {
      categoriesOverflow: (count: number) => `+${ count } ещё`,
      versionsOverflow: (count: number) => `+${ count } ещё`,
    },
  },
  modals: {
    install: {
      title: {
        install: "Установить плагин",
        update: "Обновить плагин",
      },
      actionLabel: {
        install: "Установить плагин",
        update: "Обновить плагин",
      },
      description: {
        default: "Выберите версию и настройте параметры установки",
        resolving: (title: string, versionLabel: string) =>
          `${ title } - ${ versionLabel }`,
        loadingVersionsFallback: "Загрузка версий...",
        selectVersionFallback: "Выберите версию",
      },
      states: {
        loadingDetails: "Загрузка деталей плагина",
        noSelectionTitle: "Плагин не выбран",
        noSelectionDescription:
          "Выберите плагин из каталога для начала установки",
      },
      sections: {
        versionSelection: "Выбор версии",
        compatibility: "Совместимость",
        installDependencies: "Установить зависимости",
        changelog: "Журнал изменений",
        manualDependenciesTitle: "Требуется ручная установка",
        manualDependenciesDescription:
          "Некоторые зависимости требуют ручной установки:",
        unknownProject: "Неизвестный проект",
        requiredDependencies: (count: number) =>
          `${ count } требуемая зависимость${
            count === 1 ? "я" : "ей"
          } будет установлена:`,
        noAutoDependencies: "Автоматически устанавливаемых зависимостей не найдено",
        versionDownloads: (count: number) =>
          `${ count.toLocaleString() } загрузок`,
        moreCount: (count: number) => `+${ count } ещё`,
      },
      controls: {
        chooseVersion: "Выбрать версию",
      },
      statuses: {
        loadingVersions: "Загрузка версий...",
        noVersions: "Версии недоступны",
      },
      buttons: {
        cancel: "Отмена",
        install: "Установить плагин",
        update: "Обновить плагин",
        installing: "Установка...",
        updating: "Обновление...",
        viewModrinth: "Посмотреть на Modrinth",
      },
      notifications: {
        loadProjectFailed: "Не удалось загрузить данные плагина",
        loadVersionsFailed: "Не удалось загрузить версии плагина",
        missingServer: "Выберите сервер и версию для продолжения",
        missingIdentifier: "Идентификатор плагина отсутствует",
        installationScheduled: "Установка плагина запланирована",
        updateScheduled: "Обновление плагина запланировано",
        startFailed: "Не удалось начать установку",
      },
    },
    remove: {
      title: "Удалить плагин",
      description: {
        withName: (name: string) => `Это удалит ${ name } с сервера`,
        fallback: "Подтвердить удаление плагина",
      },
      summary: {
        unknownPlugin: "Неизвестный плагин",
        unknownVersion: "Неизвестно",
        version: (version: string) => `Версия ${ version }`,
        emptyState: "Выберите плагин для продолжения",
      },
      options: {
        removeDependants: "Удалить зависимые плагины",
        removeDependantsDescription:
          "Автоматически удалить плагины, которые были установлены как зависимости",
      },
      buttons: {
        cancel: "Отмена",
        remove: "Удалить плагин",
        removing: "Удаление…",
      },
      notifications: {
        missingDetails: "Детали плагина отсутствуют",
        removeFailed: "Не удалось удалить плагин",
      },
    },
  },
};
