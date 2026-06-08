import type { TranslationDictionary } from "../../../locales/types";

export const createUserModalTranslations: TranslationDictionary = {
  modal: {
    title: "Создать нового пользователя",
    description: "Добавить новую учетную запись пользователя с определенными разрешениями и доступом к серверам",
    sections: {
      basicInfo: {
        title: "Основная информация",
        description: "Учетные данные пользователя и детали",
        username: {
          label: "Имя пользователя",
          placeholder: "Введите имя пользователя"
        },
        password: {
          label: "Пароль",
          placeholder: "Введите пароль",
          editLabel: "(оставьте пустым, чтобы сохранить текущий)",
          editPlaceholder: "Оставьте пустым, чтобы сохранить текущий пароль"
        }
      },
      serverAccess: {
        title: "Доступ к серверам",
        description: "Контролировать, к каким серверам пользователь имеет доступ",
        restrictAccess: "Ограничить доступ",
        picker: {
          placeholder: "Выберите серверы",
          selectedCount: (count: number) => `Выбрано серверов: ${ count }`,
          search: "Поиск серверов...",
          selectAll: "Выбрать все",
          clear: "Очистить",
          notFound: "Серверы не найдены",
          noServers: "Нет доступных серверов",
          remove: "Убрать сервер"
        },
        emptyState: {
          title: "Серверы не выбраны",
          description: "Выберите серверы, к которым у пользователя будет доступ"
        }
      },
      permissions: {
        title: "Разрешения",
        description: "Выберите разрешения доступа пользователя",
        selectedCount: (count: number) => `${ count } выбрано`,
        list: {
          ACCOUNTS_MANAGEMENT: {
            label: "Учетные записи",
            description: "Управление учетными записями пользователей"
          },
          FILE_MANAGER: {
            label: "Менеджер файлов",
            description: "Доступ к управлению файлами"
          },
          SERVERS_VIEW: {
            label: "Просмотр серверов",
            description: "Просмотр списка серверов, статуса и логов"
          },
          SERVERS_CONTROL: {
            label: "Управление серверами",
            description: "Запуск, остановка, перезапуск серверов и отправка команд"
          },
          SERVERS_CONFIGURE: {
            label: "Настройка серверов",
            description: "Редактирование настроек, свойств, иконки и удаление серверов"
          },
          CREATE_SERVERS: {
            label: "Создание серверов",
            description: "Создание новых серверов"
          },
          MANAGE_JAVA: {
            label: "Java",
            description: "Управление версиями Java"
          },
          MANAGE_PLUGINS: {
            label: "Плагины",
            description: "Установка и управление плагинами"
          },
          KUBEK_SETTINGS: {
            label: "Настройки системы",
            description: "Доступ к настройкам панели"
          },
          BACKUPS: {
            label: "Резервные копии",
            description: "Создание и управление резервными копиями"
          },
          SYSTEM_MONITORING: {
            label: "Мониторинг системы",
            description: "Мониторинг системных ресурсов"
          },
          SCHEDULER_MANAGEMENT: {
            label: "Планировщик задач",
            description: "Создание и управление задачами по расписанию"
          },
          AUDIT_LOG: {
            label: "Журнал аудита",
            description: "Просмотр журнала действий / аудита"
          }
        }
      }
    },
    buttons: {
      cancel: "Отмена",
      create: {
        default: "Создать пользователя",
        loading: "Создание..."
      }
    }
  },
  validation: {
    username: {
      min: "Имя пользователя должно быть не менее 3 символов",
      max: "Имя пользователя должно быть не более 32 символов",
      regex: "Имя пользователя может содержать только буквы, цифры и подчеркивания"
    },
    password: {
      min: "Пароль должен быть не менее 6 символов",
      max: "Пароль должен быть не более 64 символов",
      edit: "Пароль должен быть не менее 6 символов и не более 64 символов"
    },
    servers: {
      empty: "Имя сервера не может быть пустым"
    },
    permissions: {
      min: "Требуется хотя бы одно разрешение"
    }
  }
};