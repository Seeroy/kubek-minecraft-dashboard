import type { TranslationDictionary } from "../../../locales/types";

export const modsTranslations: TranslationDictionary = {
  dashboard: {
    header: {
      title: "Моды",
      description: "Установка и управление модами сервера",
    },
    states: {
      noServer: {
        title: "Выберите сервер для продолжения",
        description: "Выберите сервер из боковой панели для управления модами",
      },
      notAvailable: {
        title: "Моды недоступны",
        description:
          "Моды поддерживаются только на серверах с загрузчиком модов (Fabric)",
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
      loadInstalledFailed: "Не удалось загрузить установленные моды",
      selectServerFirst: "Выберите сервер перед установкой модов",
      missingProjectId: "Не удалось определить идентификатор мода",
      manualRemoveSuccess: (fileName: string) => `Удален ${ fileName }`,
      manualRemoveFailed: "Не удалось удалить ручной мод",
    },
  },
  installedTab: {
    kicker: "Моды",
    title: "Установленные моды",
    loading: "Загрузка установленных модов…",
    emptyTitle: "Моды еще не установлены",
    emptyDescription:
      "Перейдите на вкладку Доступные, чтобы найти моды и установить их одним кликом",
  },
  installedCard: {
    badges: {
      update: "Обновление",
      manual: "Ручной",
      dependency: "Зависимость",
    },
    tooltips: {
      updateAvailable: "Доступна более новая версия",
      updateButton: "Доступно обновление",
      reinstallButton: "Переустановить",
      removeButton: "Удалить мод",
    },
    labels: {
      installedOn: (date: string) => `Установлен ${ date }`,
      installedAt: (timestamp: string) => `Установлен в ${ timestamp }`,
    },
  },
  availableTab: {
    kicker: "Моды",
    title: "Каталог Modrinth",
    description: "Поиск модов для Fabric в Modrinth",
    inputPlaceholder: "Поиск модов Modrinth…",
    summary: {
      projectsFound: (count: number) =>
        `${ count.toLocaleString() } проект${ count === 1 ? "" : "ов" } найден${ count === 1 ? "" : "о" }`,
      none: "Проекты не найдены",
      showing: (count: number) => `Показывается ${ count.toLocaleString() } результат${ count === 1 ? "" : "ов" }`,
    },
    loading: {
      searching: "Поиск в Modrinth…",
      more: "Загрузка дополнительных модов…",
      end: "Больше модов для загрузки нет",
    },
    notifications: {
      searchFailed: "Не удалось запросить каталог Modrinth",
    },
    tooltips: {
      disabledInstall: "Выберите сервер для установки этого мода",
      unsupported: "Этот мод не поддерживается на стороне сервера",
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
        install: "Установить мод",
        update: "Обновить мод",
      },
      actionLabel: {
        install: "Установить мод",
        update: "Обновить мод",
      },
      description: {
        default: "Выберите версию и настройте параметры установки",
        resolving: (title: string, versionLabel: string) =>
          `${ title } - ${ versionLabel }`,
        loadingVersionsFallback: "Загрузка версий...",
        selectVersionFallback: "Выберите версию",
      },
      states: {
        loadingDetails: "Загрузка деталей мода",
        noSelectionTitle: "Мод не выбран",
        noSelectionDescription:
          "Выберите мод из каталога для начала установки",
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
        install: "Установить мод",
        update: "Обновить мод",
        installing: "Установка...",
        updating: "Обновление...",
        viewModrinth: "Посмотреть на Modrinth",
      },
      notifications: {
        loadProjectFailed: "Не удалось загрузить данные мода",
        loadVersionsFailed: "Не удалось загрузить версии мода",
        missingServer: "Выберите сервер и версию для продолжения",
        missingIdentifier: "Идентификатор мода отсутствует",
        installationScheduled: "Установка мода запланирована",
        updateScheduled: "Обновление мода запланировано",
        startFailed: "Не удалось начать установку",
      },
    },
    remove: {
      title: "Удалить мод",
      description: {
        withName: (name: string) => `Это удалит ${ name } с сервера`,
        fallback: "Подтвердить удаление мода",
      },
      summary: {
        unknownPlugin: "Неизвестный мод",
        unknownVersion: "Неизвестно",
        version: (version: string) => `Версия ${ version }`,
        emptyState: "Выберите мод для продолжения",
      },
      options: {
        removeDependants: "Удалить зависимые моды",
        removeDependantsDescription:
          "Автоматически удалить моды, которые были установлены как зависимости",
      },
      buttons: {
        cancel: "Отмена",
        remove: "Удалить мод",
        removing: "Удаление…",
      },
      notifications: {
        missingDetails: "Детали мода отсутствуют",
        removeFailed: "Не удалось удалить мод",
      },
    },
  },
};
