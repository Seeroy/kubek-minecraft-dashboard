const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const colors = require("colors");

const PREDEFINED = require("./predefined");
const COMMONS = require("./commons");
const SERVERS_CONTROLLER = require("./serversController");

global.autoStartedServers = [];

// Мигрировать старый config.json
exports.migrateOldMainConfig = () => {
    let newConfig = PREDEFINED.CONFIGURATIONS.MAIN;
    let oldConfig = this.readAnyConfig("./config.json");
    if (oldConfig.configVersion !== PREDEFINED.CONFIGURATIONS.MAIN.configVersion) {
        this.writeAnyConfig("./config.json.old", oldConfig);
        newConfig.ftpd.enabled = oldConfig.ftpd;
        newConfig.ftpd.username = oldConfig["ftpd-user"];
        newConfig.ftpd.password = oldConfig["ftpd-password"];
        newConfig.authorization = oldConfig.auth;
        newConfig.language = oldConfig.lang;
        newConfig.webserverPort = oldConfig["webserver-port"];
        this.writeAnyConfig("./config.json", newConfig);
        this.reloadAllConfigurations();
        console.log(colors.yellow("config.json"), " migration success!");
        return true;
    } else {
        return false;
    }
};

// Мигрировать старые сервера
exports.migrateOldServersConfig = () => {
    let newConfig = PREDEFINED.CONFIGURATIONS.SERVERS;
    let oldConfig = this.readAnyConfig("./servers/servers.json");
    if(Object.keys(oldConfig).length > 0 && typeof oldConfig[Object.keys(oldConfig)[0]].game === "undefined"){
        this.writeAnyConfig("./servers/servers.json.old", oldConfig);
        Object.keys(oldConfig).forEach(key => {
            let serverType = "java";
            if (fs.existsSync("./servers/" + key + "/bedrock_server.exe") || fs.existsSync("./servers/" + key + "/bedrock_server")) {
                serverType = "bedrock";
            }
            newConfig[key] = {
                status: PREDEFINED.SERVER_STATUSES.STOPPED,
                restartOnError: true,
                maxRestartAttempts: 3,
                game: "minecraft",
                minecraftType: serverType,
                stopCommand: oldConfig[key].stopCommand || "stop"
            }
        });
        this.writeAnyConfig("./servers/servers.json", newConfig);
        this.reloadAllConfigurations();
        console.log(colors.yellow("servers.json"), " migration success!");
        return true;
    } else {
        return false;
    }
};

// Записать стандартный конфиг файл
exports.writeDefaultConfig = () => {
    let preparedDefaultConfig = PREDEFINED.CONFIGURATIONS.MAIN;
    preparedDefaultConfig["language"] = COMMONS.detectUserLocale();
    this.writeAnyConfig("config.json", preparedDefaultConfig);
    return true;
};

// Записать стандартный файл пользователей
exports.writeDefaultUsersConfig = () => {
    let newHash = crypto.randomUUID().toString();
    let preparedUsersConfig = PREDEFINED.CONFIGURATIONS.USERS;
    preparedUsersConfig["kubek"]["secret"] = newHash;
    this.writeAnyConfig("users.json", preparedUsersConfig);
    return true;
};

// Читать JSON-конфиг из любого пути
exports.readAnyConfig = (filePath) => {
    if (path.extname(filePath) === ".json") {
        return JSON.parse(fs.readFileSync(filePath).toString());
    } else {
        return false;
    }
};

// Записать JSON-конфиг по любому пути
exports.writeAnyConfig = (filePath, data) => {
    if (path.extname(filePath) === ".json") {
        // Если data в виде объекта, то превращаем в JSON
        typeof data === "object" ? data = JSON.stringify(data, null, "\t") : data;
        fs.writeFileSync(filePath, data);
        return true;
    } else {
        return false;
    }
};


// Прочитать главный конфиг (записать и отдать дефолтный при отсутствии)
exports.readMainConfig = () => {
    if (!fs.existsSync("config.json")) {
        this.writeDefaultConfig();
        return PREDEFINED.CONFIGURATIONS.MAIN;
    } else {
        return this.readAnyConfig("config.json");
    }
};

// Записать главный конфиг
exports.writeMainConfig = (data) => {
    return this.writeAnyConfig("config.json", data);
};


// Прочитать конфиг пользователей (записать и отдать дефолтный при отсутствии)
exports.readUsersConfig = () => {
    if (!fs.existsSync("users.json")) {
        this.writeDefaultUsersConfig();
        return PREDEFINED.CONFIGURATIONS.USERS;
    } else {
        return this.readAnyConfig("users.json");
    }
};

// Записать конфиг пользователей
exports.writeUsersConfig = (data) => {
    return this.writeAnyConfig("users.json", data);
};


// Прочитать конфиг серверов (записать и отдать дефолтный при отсутствии)
exports.readServersConfig = () => {
    if (fs.existsSync("./servers/servers.json")) {
        let rdServersCfg = this.readAnyConfig("./servers/servers.json");
        return rdServersCfg;
    } else {
        if (!fs.existsSync("./servers")) {
            fs.mkdirSync("./servers");
        }
        this.writeAnyConfig("./servers/servers.json", PREDEFINED.CONFIGURATIONS.SERVERS);
        return PREDEFINED.CONFIGURATIONS.SERVERS;
    }
};

// Автоматически запустить сервера, которые были запущены при закрытии Kubek
exports.autoStartServers = () => {
    for (const [key, value] of Object.entries(serversConfig)) {
        if(serversConfig[key].status !== PREDEFINED.SERVER_STATUSES.STOPPED && !autoStartedServers.includes(key)){
            // Запускаем сервер, который был запущен до остановки Kubek
            serversConfig[key].status = PREDEFINED.SERVER_STATUSES.STOPPED;
            SERVERS_CONTROLLER.startServer(key);
            autoStartedServers.push(key);
        }
    }
};

// Записать конфиг серверов
exports.writeServersConfig = (data) => {
    return this.writeAnyConfig("./servers/servers.json", data);
};

// Перезагрузить все конфиги в память
exports.reloadAllConfigurations = () => {
    global.mainConfig = this.readMainConfig();
    global.usersConfig = this.readUsersConfig();
    global.serversConfig = this.readServersConfig();
};

// DEVELOPED by seeeroy