const PREDEFINED = require("./predefined");
const COMMONS = require("./commons");
const SERVERS_MANAGER = require("./serversManager");
const FILE_MANAGER = require("./fileManager");
const MULTILANG = require("./multiLanguage");
const ERRORS_PARSER = require("./minecraftErrorsParser");

const fs = require("fs");
const path = require("path");
const treekill = require("tree-kill");
const spParser = require("minecraft-server-properties");
const {spawn} = require("node:child_process");
const mcs = require("node-mcstatus");

global.serversInstances = {};
global.instancesLogs = {};
global.restartAttempts = {};
global.serversToManualRestart = [];

// Проверить готовность сервера к запуску
exports.isServerReadyToStart = (serverName) => {
    let serverStarterPath = this.getStartFilePath(serverName);
    if (serverStarterPath === false) {
        return false;
    }
    return Object.keys(serversConfig).includes(serverName) && serversConfig[serverName].status === PREDEFINED.SERVER_STATUSES.STOPPED && fs.existsSync(serverStarterPath);
};

// Получить кол-во строк из лога сервера
exports.getServerLog = (serverName, linesCountMinus = -100) => {
    if (COMMONS.isObjectsValid(instancesLogs[serverName])) {
        return instancesLogs[serverName].split(/\r?\n/).slice(linesCountMinus).join("\r\n").replaceAll(/\</gim, "&lt;").replaceAll(/\>/gim, "&gt;");
    }
    return "";
};

// Добавить текст в лог сервера
exports.writeServerLog = (serverName, data) => {
    instancesLogs[serverName] = instancesLogs[serverName] + data;
    return true;
};

// Провести обрезку логов серверов в памяти до определённого количества строк
exports.doServersLogsCleanup = () => {
    Object.keys(instancesLogs).forEach(serverName => {
        instancesLogs[serverName] = instancesLogs[serverName].split(/\r?\n/)
            .slice(PREDEFINED.MAX_SERVER_LOGS_LENGTH_MINUS)
            .join("\r\n");
    });
    return true;
};

// Подготовить сервер к запуску (возвращает параметры запуска для сервера)
exports.prepareServerToStart = (serverName) => {
    instancesLogs[serverName] = "";
    let serverStarterPath = this.getStartFilePath(serverName);
    if (serverStarterPath === false) {
        return false;
    }
    let spawnArgs = [];
    // Создаём аргументы для spawn и путь к файлу в зависимости от платформы
    if (process.platform === "win32") {
        spawnArgs[0] = path.resolve(serverStarterPath);
    } else if (process.platform === "linux") {
        spawnArgs[0] = "sh";
        spawnArgs[1] = [path.resolve(serverStarterPath)];
    } else {
        return false;
    }
    SERVERS_MANAGER.setServerStatus(serverName, PREDEFINED.SERVER_STATUSES.STARTING);
    return {
        path: serverStarterPath,
        spawnArgs: spawnArgs
    };
};

// Остановить сервер
exports.stopServer = (serverName) => {
    if (SERVERS_MANAGER.isServerExists(serverName) && SERVERS_MANAGER.getServerStatus(serverName) === PREDEFINED.SERVER_STATUSES.RUNNING) {
        this.writeToStdin(serverName, SERVERS_MANAGER.getServerInfo(serverName).stopCommand);
        return true;
    }
    return false;
}

// Запустить сервер
exports.startServer = (serverName) => {
    if (this.isServerReadyToStart(serverName)) {
        // Получаем параметры запуска и производим запуск
        let startProps = this.prepareServerToStart(serverName);
        if (startProps !== false) {
            // Создаём spawn и добавляем хэндлеры
            if (startProps.spawnArgs.length === 1) {
                serversInstances[serverName] = spawn(startProps.spawnArgs[0]);
            } else if (startProps.spawnArgs.length === 2) {
                serversInstances[serverName] = spawn(startProps.spawnArgs[0], startProps.spawnArgs[1]);
            } else {
                return false;
            }
            this.addInstanceCloseEventHandler(serverName);
            this.addInstanceStdEventHandler(serverName);
            return true;
        }
    }
    return false;
};

// Перезапустить сервер
exports.restartServer = (serverName) => {
    serversToManualRestart.push(serverName);
    this.stopServer(serverName);
    return true;
};

// Добавить handler для закрытия на instance
exports.addInstanceCloseEventHandler = (serverName) => {
    serversInstances[serverName].on("close", (code) => {
        SERVERS_MANAGER.setServerStatus(serverName, PREDEFINED.SERVER_STATUSES.STOPPED);
        if (code != null && code > 1 && code !== 127) {
            // Если сервер завершился НЕНОРМАЛЬНО
            this.writeServerLog(serverName, MULTILANG.translateText(currentLanguage, "{{serverConsole.stopCode}}", code));
            if (serversConfig[serverName].restartOnError === true) {
                if (restartAttempts[serverName] >= serversConfig[serverName].maxRestartAttempts) {
                    // Если не удалось запустить сервер после макс. кол-ва попыток
                    this.writeServerLog(serverName, MULTILANG.translateText(currentLanguage, "{{serverConsole.restartFailed}}", restartAttempts[serverName]));
                } else {
                    // Пробуем перезапустить сервер
                    if (COMMONS.isObjectsValid(restartAttempts[serverName])) {
                        restartAttempts[serverName]++;
                    } else {
                        restartAttempts[serverName] = 1;
                    }
                    this.writeServerLog(serverName, MULTILANG.translateText(currentLanguage, "{{serverConsole.restartAttempt}}", restartAttempts[serverName]));
                    this.startServer(serverName);
                }
            }
        } else if (code === 1 || code === 127) {
            // Если сервер был убит
            this.writeServerLog(serverName, MULTILANG.translateText(currentLanguage, "{{serverConsole.killed}}"));
        } else {
            this.writeServerLog(serverName, MULTILANG.translateText(currentLanguage, "{{serverConsole.gracefulShutdown}}"));
            // Перезапускаем сервер, если он есть в массиве для перезапуска
            if(serversToManualRestart.includes(serverName)){
                this.startServer(serverName);
                serversToManualRestart.splice(serversToManualRestart.indexOf(serverName), 1);
            }
        }
    });
};

// Обрабатываем выходные потоки сервера
exports.handleServerStd = (serverName, data) => {
    //data = iconvlite.decode(data, "utf-8").toString();
    data = data.toString();
    this.writeServerLog(serverName, data);
    // Проверяем на ошибки
    let isAnyErrorsHere = ERRORS_PARSER.checkStringForErrors(data);
    if(isAnyErrorsHere !== false){
        // Добавляем в лог описание найденных ошибок
        this.writeServerLog(serverName, "§c§l" + MULTILANG.translateText(currentLanguage, isAnyErrorsHere));
    }

    // Проверяем маркеры смены статуса
    Object.keys(PREDEFINED.SERVER_STATUS_CHANGE_MARKERS).forEach((key) => {
        if (COMMONS.testForRegexArray(data, PREDEFINED.SERVER_STATUS_CHANGE_MARKERS[key])) {
            // При нахождении маркера меняем статус
            SERVERS_MANAGER.setServerStatus(serverName, PREDEFINED.SERVER_STATUSES[key]);
        }
    });
};

// Добавить хэндлер на stdout и stderr сервера
exports.addInstanceStdEventHandler = (serverName) => {
    serversInstances[serverName].stdout.on("data", (data) => {
        this.handleServerStd(serverName, data);
    });
    serversInstances[serverName].stderr.on("data", (data) => {
        this.handleServerStd(serverName, data);
    });
};

// Отправить текст в stdin сервера (в консоль)
exports.writeToStdin = (serverName, data) => {
    if (COMMONS.isObjectsValid(serversInstances[serverName])) {
        data = Buffer.from(data, "utf-8").toString();
        this.writeServerLog(serverName, data + "\n");
        serversInstances[serverName].stdin.write(data + "\n");
        return true;
    }
    return false;
};

// Принудительно завершить сервер
exports.killServer = (serverName) => {
    if (COMMONS.isObjectsValid(serversInstances[serverName], serversInstances[serverName].pid)) {
        treekill(serversInstances[serverName].pid, () => {
        });
        return true;
    }
    return false;
};

// Получить скрипт запуска сервера
exports.getStartScript = (serverName) => {
    let startFileData, startFilePath;
    if (SERVERS_MANAGER.isServerExists(serverName)) {
        startFilePath = this.getStartFilePath(serverName);
        startFileData = fs.readFileSync(startFilePath);
        startFileData = startFileData.toString().split("\n");
        return startFileData[startFileData.length - 1];
    }
    return false;
};

// Записать скрипт запуска сервера
exports.setStartScript = (serverName, data) => {
    let startFileData, startFilePath;
    if (SERVERS_MANAGER.isServerExists(serverName)) {
        startFilePath = this.getStartFilePath(serverName);
        startFileData = fs.readFileSync(startFilePath);
        startFileData = startFileData.toString().split("\n");
        startFileData[startFileData.length - 1] = data;
        fs.writeFileSync(startFilePath, startFileData.join("\n"));
        return true;
    }
    return false;
};

// Сгенерировать путь к файлу запуска сервера
exports.getStartFilePath = (serverName) => {
    if (process.platform === "win32") {
        return "./servers/" + serverName + "/start.bat";
    } else if (process.platform === "linux") {
        return "./servers/" + serverName + "/start.sh";
    } else {
        return false;
    }
};

// Получить файл server.properties (после парсинга)
exports.getServerProperties = (serverName) => {
    let spFilePath = "./servers/" + serverName + "/server.properties";
    if (fs.existsSync(spFilePath)) {
        let spFileData = fs.readFileSync(spFilePath).toString();
        return spParser.parse(spFileData);
    }
    return false;
};

// Сохранить файл server.properties
exports.saveServerProperties = (serverName, data) => {
    let parsed = JSON.parse(data);
    let result = "";
    for (const [key, value] of Object.entries(parsed)) {
        result += "\n" + key.toString() + "=" + value.toString();
    }
    FILE_MANAGER.writeFile(serverName, "/server.properties", result);
    return true;
};

// Получить информацию о сервере
exports.queryServer = (serverName, cb) => {
    let spData = this.getServerProperties(serverName);
    if (COMMONS.isObjectsValid(spData['server-port']) && COMMONS.isObjectsValid(serversInstances[serverName])) {
        let chkPort = spData['server-port'];
        const chkOptions = {query: false};
        mcs.statusJava("127.0.0.1", chkPort, chkOptions)
            .then((result) => {
                cb(result);
            })
            .catch((error) => {
                console.error(error);
                cb(false);
            })
    } else {
        cb(false);
    }
}

// DEVELOPED by seeeroy