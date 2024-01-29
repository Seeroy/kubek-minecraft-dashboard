class KubekPredefined {
    // Права
    static PERMISSIONS = {
        DEFAULT: "default",
        ACCOUNTS: "accounts",
        FILE_MANAGER: "file_manager",
        MANAGE_SERVERS: "manage_servers",
        MAKING_SERVERS: "making_servers",
        MONITOR_SERVERS: "monitor_servers",
        MANAGE_JAVA: "manage_java",
        MANAGE_PLUGINS: "manage_plugins"
    };

    // См. название :)
    static API_ENDPOINT = "/api";

    // Переводы статусов серверов
    static SERVER_STATUSES_TRANSLATE = {
        "stopped": "{{serverStatus.stopped}}",
        "starting": "{{serverStatus.starting}}",
        "stopping": "{{serverStatus.stopping}}",
        "running": "{{serverStatus.running}}"
    }

    // Статусы серверов
    static SERVER_STATUSES = {
        STOPPED: "stopped",
        RUNNING: "running",
        STARTING: "starting",
        STOPPING: "stopping"
    }

    // Базовые типы задач
    static TASKS_TYPES = {
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

    // Шаги создания сервера
    static SERVER_CREATION_STEPS = {
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

    // REGEX для авторизации
    static PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,64}$/g;
    static LOGIN_REGEX = /^[a-zA-Z0-9_.-]{3,16}$/g;
    static EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;

    static MODAL_CANCEL_BTN = '<button class="dark-btn" onclick="KubekNotifyModal.destroyAllModals()">{{commons.close}}</button>';
}