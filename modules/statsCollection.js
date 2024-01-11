const packageJSON = require("./../package.json");
const LOGGER = require("./logger");
const COMMONS = require("./commons");
const PREDEFINED = require("./predefined");

const {machineIdSync} = require('node-machine-id');
const fs = require("fs");
const os = require("os");

// Получить уникальный ID компьютера
exports.getUniqueID = machineIdSync;

// Собрать статистику о ПК
exports.collectStats = () => {
    let uniqueID = this.getUniqueID();
    let cpuCommon = os.cpus();
    let usersCount = Object.keys(usersConfig).length;
    let serversCount = Object.keys(serversConfig).length;
    let javasInstalled = this.getAllJavaInstalled();
    let platformProps = {
        name: os.type(),
        release: os.release(),
        arch: process.arch,
        version: os.version(),
    };
    let cpuProps = {
        model: cpuCommon[0].model,
        speed: cpuCommon[0].speed,
        cores: cpuCommon.length,
    };
    return {
        platform: platformProps,
        totalRAM: Math.round(os.totalmem() / 1024 / 1024),
        cpu: cpuProps,
        uniqueID: uniqueID,
        language: mainConfig.language,
        version: packageJSON.version,
        javas: JSON.stringify(javasInstalled),
        serversCount: serversCount,
        authEnabled: mainConfig.authorization,
        usersCount: usersCount,
        tgbotEnabled: mainConfig.telegramBot.enabled,
        ftpdEnabled: mainConfig.ftpd.enabled,
        uptime: Math.round(process.uptime())
    };
}

// Получить все установленные версии Java
exports.getAllJavaInstalled = () => {
    if (process.platform === "win32") {
        let directories = [
            "C:/Program Files",
            "C:/Program Files(x86)",
            "C:/Program Files (x86)",
        ];
        let tree = [
            "Java",
            "JDK",
            "OpenJDK",
            "OpenJRE",
            "Adoptium",
            "JRE",
            "AdoptiumJRE",
            "Temurin",
        ];
        let javas = [];
        directories.forEach(function (mainDir) {
            tree.forEach(function (inner) {
                let directory = mainDir + "/" + inner;
                if (fs.existsSync(directory)) {
                    fs.readdirSync(directory).forEach(function (jvs) {
                        if (fs.existsSync(directory + "/" + jvs + "/bin/java.exe")) {
                            javas.push(directory + "/" + jvs + "/bin/java.exe");
                        }
                    });
                }
            });
        });
        return javas;
    }
    return ["java"];
};

// Отправить статистику на сервер
exports.sendStatsToServer = (statsData, isOnStart, cb = () => {
}) => {
    let statsResultURL = PREDEFINED.STATS_SEND_URL + encodeURIComponent(JSON.stringify(statsData)) + "&start=" + isOnStart;

    COMMONS.getDataByURL(statsResultURL, (stResult) => {
        if(stResult === false){
            LOGGER.warning("Oops! An error occurred while sending statistics:", stResult.toString());
            cb(false);
            return;
        }
        cb(true);
    });
};