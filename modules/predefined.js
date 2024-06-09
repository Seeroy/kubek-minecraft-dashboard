const SHA256 = require("crypto-js/sha256");

// Предопределяем стандартные значения прав
exports.PERMISSIONS = {
    DEFAULT: "default",
    ACCOUNTS: "accounts",
    FILE_MANAGER: "file_manager",
    MANAGE_SERVERS: "manage_servers",
    MAKING_SERVERS: "making_servers",
    MONITOR_SERVERS: "monitor_servers",
    MANAGE_JAVA: "manage_java",
    MANAGE_PLUGINS: "manage_plugins",
    SYSTEM_MONITORING: "system_monitoring",
    KUBEK_SETTINGS: "kubek_settings"
}

// Список ссылок, доступных БЕЗ права MANAGE_SERVERS
exports.MONITOR_SERVERS_PERM_URLS = [
    {
        url: "/",
        method: "GET"
    },
    {
        url: /\/.*\/log/gi,
        method: "GET"
    },
    {
        url: /\/.*\/icon/gi,
        method: "GET"
    },
    {
        url: /\/.*\/info/gi,
        method: "GET"
    },
    {
        url: /\/.*\/query/gi,
        method: "GET"
    },
    {
        url: /\/.*\/startScript/gi,
        method: "GET"
    },
    {
        url: /\/.*\/server.properties/gi,
        method: "GET"
    }
];

// Базовые директории, которые необходимо создать
exports.BASE_DIRS = ["backups", "logs", "servers", "binaries", "binaries/java"];

// Базовые типы задач
exports.TASKS_TYPES = {
    DOWNLOADING: "downloading",
    INSTALLING: "installing",
    ZIPPING: "zipping",
    UNPACKING: "unpacking",
    UPDATING: "updating",
    RESTARTING: "restarting",
    CREATING: "creating",
    DELETION: "deletion",
    COMMON: "common",
    UNKNOWN: "unknown"
}

// Максимальное кол-во строк логов сервера в памяти
exports.MAX_SERVER_LOGS_LENGTH_MINUS = -800;

// ASCII-логотип Kubek
exports.KUBEK_LOGO_ASCII = " /$$                 /$$                 /$$      \n| $$                | $$                | $$      \n| $$   /$$ /$$   /$$| $$$$$$$   /$$$$$$ | $$   /$$\n| $$  /$$/| $$  | $$| $$__  $$ /$$__  $$| $$  /$$/\n| $$$$$$/ | $$  | $$| $$   $$| $$$$$$$$| $$$$$$/ \n| $$_  $$ | $$  | $$| $$  | $$| $$_____/| $$_  $$ \n| $$   $$|  $$$$$$/| $$$$$$$/|  $$$$$$$| $$   $$\n|__/  __/ ______/ |_______/  _______/|__/  __/";

// URL к API для проверки обновлений
exports.UPDATES_URL_API = "https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases";

// URL к API для отправки статистики
exports.STATS_SEND_URL = "https://statscol.seeeroy.ru/save_kubek?savedata=";

// URL с файлом ядер Spigot
exports.SPIGOT_JSON_URL = "https://kubek.seeeroy.ru/spigots.json";

// URL со списком доступных версий Java
exports.JAVA_LIST_URL = "https://api.adoptium.net/v3/info/available_releases";

// Маркеры для смены статуса сервера
exports.SERVER_STATUS_CHANGE_MARKERS = {
    STARTING: [
        /Loading libraries/gim,
        /Advanced terminal features are/gim,
        /Enabled Waterfall version/gim,
        /Starting server/gim,
        /Starting minecraft server/gim
    ],
    RUNNING: [/Server started/gim, /Listening on/gim, /Done/gim],
    STOPPING: [/Saving players/gim, /Server stop requested/gim]
}

// Стандартный пароль для пользователя kubek
exports.DEFAULT_KUBEK_PASSWORD = "Kubek2024";

// Предопределяем стандартные конфигурации
exports.CONFIGURATIONS = {
    MAIN: {
        language: "en",
        eulaAccepted: false,
        ftpd: {
            enabled: false,
            username: "kubek",
            password: "kubek",
            port: 21
        },
        authorization: false,
        allowOnlyIPsList: false,
        IPsAllowed: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "100.64.0.0/10", "127.0.0.1/32"],
        telegramBot: {
            enabled: false,
            token: "",
            chatIds: []
        },
        webserverPort: 3000,
        configVersion: 2
    },
    USERS: {
        "kubek": {
            username: "kubek",
            password: SHA256(this.DEFAULT_KUBEK_PASSWORD).toString(),
            email: "",
            secret: "",
            permissions: Object.values(this.PERMISSIONS),
            serversAccessRestricted: false,
            serversAllowed: []
        }
    },
    SERVERS: {}
}

// REGEX для авторизации
exports.PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,64}$/g;
exports.LOGIN_REGEX = /^[a-zA-Z0-9_.-]{3,16}$/g;
exports.EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;

// Стандартная конфигурация доступных ядер
exports.SERVER_CORES = {
    vanilla: {
        name: "vanilla",
        displayName: "Vanilla",
        versionsMethod: "externalURL",
        versionsUrl: "https://kubek.seeeroy.ru/vanilla.json",
        urlGetMethod: "externalURL"
    },
    paper: {
        name: "paper",
        displayName: "PaperMC",
        versionsMethod: "paper",
        urlGetMethod: "paper"
    },
    waterfall: {
        name: "waterfall",
        displayName: "Waterfall (Proxy)",
        versionsMethod: "paper",
        urlGetMethod: "paper"
    },
    velocity: {
        name: "velocity",
        displayName: "Velocity (Proxy)",
        versionsMethod: "paper",
        urlGetMethod: "paper"
    },
    purpur: {
        name: "purpur",
        displayName: "PurpurMC",
        versionsMethod: "purpur",
        urlGetMethod: "purpur"
    },
    spigot: {
        name: "spigot",
        displayName: "Spigot",
        versionsMethod: "externalURL",
        versionsUrl: "https://kubek.seeeroy.ru/spigots.json",
        urlGetMethod: "externalURL"
    },
};

// Шаги создания сервера
exports.SERVER_CREATION_STEPS = {
    SEARCHING_CORE: "searchingCore",
    CHECKING_JAVA: "checkingJava",
    DOWNLOADING_JAVA: "downloadingJava",
    UNPACKING_JAVA: "unpackingJava",
    DOWNLOADING_CORE: "downloadingCore",
    CREATING_BAT: "creatingBat",
    COMPLETION: "completion",
    COMPLETED: "completed",
    FAILED: "failed",
}

// Статусы серверов
exports.SERVER_STATUSES = {
    STOPPED: "stopped",
    RUNNING: "running",
    STARTING: "starting",
    STOPPING: "stopping"
}

// Стандартная иконка Kubek в base64
exports.DEFAULT_KUBEK_ICON = "iVBORw0KGgoAAAANSUhEUgAAAD4AAAA+CAYAAABzwahEAAABMWlDQ1BBZG9iZSBSR0IgKDE5OTgpAAAoz62OsUrDUBRAz4ui4lArBHFweJMoKLbqYMakLUUQrNUhydakoUppEl5e1X6Eo1sHF3e/wMlRcFD8Av9AcergECGDgwie6dzD5XLBqNh1p2GUYRBr1W460vV8OfvEDFMA0Amz1G61DgDiJI74wecrAuB50647Df7GfJgqDUyA7W6UhSAqQP9CpxrEGDCDfqpB3AGmOmnXQDwApV7uL0ApyP0NKCnX80F8AGbP9Xww5gAzyH0FMHV0qQFqSTpSZ71TLauWZUm7mwSRPB5lOhpkcj8OE5UmqqOjLpD/B8BivthuOnKtall76/wzrufL3N6PEIBYeixaQThU598qjJ3f5+LGeBkOb2F6UrTdK7jZgIXroq1WobwF9+MvwMZP/U6/OGUAAAAJcEhZcwAACxMAAAsTAQCanBgAAAXRaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjQtMDEtMDlUMDk6NTc6MzUrMDM6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDEtMDlUMDk6NTc6MzUrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDI0LTAxLTA5VDA5OjU3OjM1KzAzOjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmY2MjBiZWZmLTI4NzctNjQ0OS05MmY5LTM5M2RmNjE1MTIxYiIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjFhNWMzZmU3LWI2ODctZWM0My1hYWU1LTJlZTdjOWUyZWNlOCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmU4ZDU2ZWE1LTc2MTUtNzE0ZS1hOGFlLWMxYzg2OGQyNjMxMiIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmU4ZDU2ZWE1LTc2MTUtNzE0ZS1hOGFlLWMxYzg2OGQyNjMxMiIgc3RFdnQ6d2hlbj0iMjAyNC0wMS0wOVQwOTo1NzozNSswMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmNjIwYmVmZi0yODc3LTY0NDktOTJmOS0zOTNkZjYxNTEyMWIiIHN0RXZ0OndoZW49IjIwMjQtMDEtMDlUMDk6NTc6MzUrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlz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";

// Regex для URL, которые не нужно сохранять в лог
exports.NO_LOG_URLS = [/\/api\/tasks.*/gi, /\/api\/servers.*\/icon.*/gi, /\/api\/servers.*\/query/gi, /\/api\/servers.*\/info/gi, /\/api\/servers.*\/log/gi, "/api/fileManager/chunkWrite/add", "/api/servers", /.*\.woff2/gi, /.*\.js/gi, /.*\.css/gi, /.*\.ttf/gi, /.*\.png/gi, /.*\.ico/gi, "/api/kubek/hardware/usage", "/api/kubek/heartbeat"];

// Разрешённые расширения для статических файлов
exports.ALLOWED_STATIC_EXTS = ["html", "css", "js", "json", "png", "ico", "svg", "jpg", "jpeg", "xml", "txt", "eof", "woff", "woff2", "ttf"];

// Расширения для перевода статических файлов
exports.TRANSLATION_STATIC_EXTS = ["html", "js", "txt", "json"];

// URL, которым можно пропускать авторизацию и проверку прав
exports.SKIP_AUTH_URLS = [/\/api\/auth\/login\/.*\/.*/gi, /\/login.html/gi, /\/assets\/.*/gi, /\/css\/.*/gi, /\/js\/.*/gi]