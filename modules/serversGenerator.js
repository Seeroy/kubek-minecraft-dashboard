const TASK_MANAGER = require("./taskManager");
const CORES_MANAGER = require("./coresManager");
const JAVA_MANAGER = require("./javaManager");
const DOWNLOADS_MANAGER = require("./downloadsManager");
const SERVERS_MANAGER = require("./serversManager");
const PREDEFINED = require("./predefined");
const CONFIGURATION = require("./configuration");
const LOGGER = require("./logger");
const MULTILANG = require("./multiLanguage");

const fs = require("fs");
const path = require("path");
const colors = require("colors");

async function prepareJavaForServer(javaVersion, cb) {
    let javaExecutablePath = "";
    let javaDownloadURL = "";
    let isJavaNaN = isNaN(parseInt(javaVersion));

    if (isJavaNaN && fs.existsSync(javaVersion)) {
        // Если в аргументе указан путь к существующему файла Java
        javaExecutablePath = javaVersion;
    } else if (!isJavaNaN) {
        // Если передана версия Java, то не делаем ничего
    } else {
        // Если версия Java не была передана
        cb(false);
        return;
    }

    // Если в javaVersion указана версия Java, а не путь
    if (!isJavaNaN) {
        javaExecutablePath = JAVA_MANAGER.getJavaPath(javaVersion);

        // Если мы не смогли найти нужную версию Java в папке
        if (javaExecutablePath === false) {
            let javaVerInfo = JAVA_MANAGER.getJavaInfoByVersion(javaVersion);
            javaDownloadURL = javaVerInfo.url;

            // Начинаем скачивание нужной версии Java
            DOWNLOADS_MANAGER.addDownloadTask(javaDownloadURL, javaVerInfo.downloadPath, (javaDlResult) => {
                if (javaDlResult === true) {
                    // Если скачивание успешно завершено, то распаковываем
                    DOWNLOADS_MANAGER.unpackArchive(javaVerInfo.downloadPath, javaVerInfo.unpackPath, (javaUnpackResult) => {
                        if (javaUnpackResult === true) {
                            // Если всё успешно распаковалось - просто перезапускаем создание сервера с теми же параметрами
                            javaExecutablePath = JAVA_MANAGER.getJavaPath(javaVersion);
                            cb(javaExecutablePath);
                        } else {
                            LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.javaUnpackFailed}}"));
                            cb(false);
                        }
                    }, true);
                } else {
                    LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.javaDownloadFailed}}"));
                    cb(false);
                }
            });
        } else {
            cb(javaExecutablePath);
        }
    } else {
        cb(javaExecutablePath);
    }
}

// Функция для запуска создания сервера Java
async function startJavaServerGeneration(serverName, core, coreVersion, startParameters, javaExecutablePath, serverPort, cb) {
    let coreDownloadURL = "";
    let coreFileName = core + "-" + coreVersion + ".jar";

    // Создаём задачу на создание сервера
    let creationTaskID = TASK_MANAGER.addNewTask({
        type: PREDEFINED.TASKS_TYPES.CREATING,
        serverName: serverName,
        core: core,
        coreVersion: coreVersion,
        startParameters: startParameters,
        javaExecutablePath: javaExecutablePath,
        currentStep: null
    })

    // Если сервер с таким названием уже существует - не продолжаем
    if (SERVERS_MANAGER.isServerExists(serverName)) {
        cb(false);
        return false;
    }

    if (javaExecutablePath !== false) {
        // Создаём весь путь для сервера
        let serverDirectoryPath = "./servers/" + serverName;
        fs.mkdirSync(serverDirectoryPath, {recursive: true});

        if (core.match(/\:\/\//gim) === null && fs.existsSync("./servers/" + serverName + path.sep + core)) {
            // ЕСЛИ ЯДРО РАСПОЛОЖЕНО ЛОКАЛЬНО
            tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.COMPLETED;
            // Добавляем новый сервер в конфиг
            serversConfig[serverName] = {
                status: PREDEFINED.SERVER_STATUSES.STOPPED,
                restartOnError: true,
                maxRestartAttempts: 3,
                game: "minecraft",
                minecraftType: "java",
                stopCommand: "stop"
            };
            // DEVELOPED by seeeroy
            CONFIGURATION.writeServersConfig(serversConfig);
            this.writeJavaStartFiles(serverName, core, startParameters, javaExecutablePath, serverPort);
            LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.serverCreatedSuccess}}", colors.cyan(serverName)));
            cb(true);
        } else {
            // ЕСЛИ ЯДРО НУЖНО СКАЧИВАТЬ
            tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.SEARCHING_CORE;
            CORES_MANAGER.getCoreVersionURL(core, coreVersion, (url) => {
                coreDownloadURL = url;
                tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.CHECKING_JAVA;
                // Скачиваем ядро для сервера
                tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.DOWNLOADING_CORE;
                DOWNLOADS_MANAGER.addDownloadTask(coreDownloadURL, serverDirectoryPath + path.sep + coreFileName, (coreDlResult) => {
                    if (coreDlResult === true) {
                        tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.COMPLETED;
                        // Добавляем новый сервер в конфиг
                        serversConfig[serverName] = {
                            status: PREDEFINED.SERVER_STATUSES.STOPPED,
                            restartOnError: true,
                            maxRestartAttempts: 3,
                            game: "minecraft",
                            minecraftType: "java",
                            stopCommand: "stop"
                        };
                        CONFIGURATION.writeServersConfig(serversConfig);
                        this.writeJavaStartFiles(serverName, coreFileName, startParameters, javaExecutablePath, serverPort);
                        LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.serverCreatedSuccess}}", colors.cyan(serverName)));
                        cb(true);
                    } else {
                        tasks[creationTaskID].currentStep = PREDEFINED.SERVER_CREATION_STEPS.FAILED;
                        LOGGER.warning(MULTILANG.translateText(mainConfig.language, "{{console.coreDownloadFailed}}"));
                        cb(false);
                    }
                });
            });
        }
    }
}

// Записать файлы запуска и eula для сервера Java
exports.writeJavaStartFiles = (serverName, coreFileName, startParameters, javaExecutablePath, serverPort) => {
    let fullStartParameters = "-Dfile.encoding=UTF-8 " + startParameters + " -jar " + coreFileName + " nogui";
    let fullJavaExecutablePath = path.resolve(javaExecutablePath);
    fs.writeFileSync("./servers/" + serverName + "/eula.txt", "eula=true");
    if (process.platform === "win32") {
        fs.writeFileSync("./servers/" + serverName + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + serverName + "\n" + '"' + fullJavaExecutablePath + '"' + " " + fullStartParameters);
    } else if (process.platform === "linux") {
        fs.writeFileSync("./servers/" + serverName + "/start.sh", "cd servers\ncd " + serverName + "\n" + '"' + fullJavaExecutablePath + '"' + " " + fullStartParameters);
    }
    fs.writeFileSync(
        "./servers/" + serverName + "/server.properties",
        "server-port=" +
        serverPort +
        "\nquery.port=" +
        serverPort +
        "\nenable-query=true\nonline-mode=false" +
        "\nmotd=\u00A7f" +
        serverName
    );
    return true;
};

// Записать файл запуска для сервера Bedrock
exports.writeBedrockStartFiles = (serverName) => {
    fs.writeFileSync("./servers/" + serverName + "/eula.txt", "eula=true");
    if (process.platform === "win32") {
        fs.writeFileSync("./servers/" + serverName + "/start.bat", "pushd %~dp0\nbedrock_server.exe\npopd");
    } else if (process.platform === "linux") {
        fs.writeFileSync("./servers/" + serverName + "/start.sh", "LD_LIBRARY_PATH=. ./bedrock_server");
    }
    return true;
};

module.exports.startJavaServerGeneration = startJavaServerGeneration;
module.exports.prepareJavaForServer = prepareJavaForServer;