import type { TranslationDictionary } from "../../../locales/types";

function files(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} файл`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} файла`;
  return `${n} файлов`;
}

export const modpacksTranslations: TranslationDictionary = {
  sources: {
    label: "Источник импорта",
    archive: "Архив Kubek",
    mrpack: "Файл .mrpack",
    modrinth: "Modrinth",
  },
  hints: {
    archive: "Zip-архив, выгруженный из Kubek",
    mrpack: "Модпак Modrinth на загрузчике Fabric",
    modrinth: "Найдите модпак на Fabric и выберите версию",
    preview: "Проверьте, что ставит пак, и настройте сервер",
    progress: "Сервер собирается из пака",
  },
  mrpack: {
    title: "Файл модпака",
    hint: "Перетащите .mrpack сюда или выберите его, только паки на Fabric",
    button: "Выбрать файл",
    busy: "Читаем пак",
    invalid: "Выберите файл с расширением .mrpack",
  },
  modrinth: {
    searchPlaceholder: "Поиск модпаков на Fabric",
    searchLabel: "Поиск модпаков",
    empty: "Нет серверных паков на Fabric по этому запросу",
    error: "Modrinth не ответил, попробуйте чуть позже",
    downloads: (n: string) => `${n} загрузок`,
    version: "Версия",
    loadingVersions: "Загружаем версии",
    noVersions: "У этого пака нет версий на Fabric",
    read: "Продолжить",
    types: { beta: "бета", alpha: "альфа" },
    back: "К результатам",
  },
  preview: {
    minecraft: "Minecraft",
    loader: "Загрузчик Fabric",
    mods: "Моды",
    files,
    download: "Объём загрузки",
    clientOnly: (n: number) => `${files(n)} только для клиента, пропущено`,
    warnings: {
      optional_server_files: (n: number) => `${files(n)} помечено как необязательные для сервера, ставим всё равно`,
      unknown_env_files: (n: number) => `${files(n)} без указанной стороны, ставим всё равно`,
      client_overrides_ignored: "Клиентские настройки из пака на сервер не копируются",
    },
  },
  form: {
    title: "Настройки сервера",
    name: "Название сервера",
    port: "Порт",
    portTaken: (name: string) => `Уже занят сервером "${name}"`,
    memory: "Память",
    memoryUnit: "МБ",
    java: "Java",
    nameRequired: "Введите название сервера",
    portInvalid: "Порт от 1 до 65535",
    memoryInvalid: "Не меньше 512 МБ",
  },
  actions: {
    back: "Назад",
    create: "Создать сервер",
    creating: "Создаём",
    close: "Закрыть",
    done: "Готово",
    openConsole: "Открыть консоль",
  },
  errors: {
    MODPACK_LOADER_UNSUPPORTED: "Ставятся только модпаки на Fabric, паки на Quilt, Forge и NeoForge пока не поддерживаются",
    MODPACK_INVALID: "Это не похоже на модпак Modrinth",
    MODPACK_UNSAFE_PATH: "Пак пытается записать файлы за пределы папки сервера",
    MODPACK_DOWNLOAD_NOT_ALLOWED: "Пак скачивает файлы с неразрешённых адресов",
    MODPACK_NOT_FOUND: "Превью устарело, прочитайте пак ещё раз",
    nameTaken: "Сервер с таким названием уже есть",
    generic: "Не удалось прочитать модпак",
  },
};
