const SERVERS_CONTROLLER = require("./../modules/serversController");
const SERVERS_GENERATOR = require("./../modules/serversGenerator");
const SERVERS_MANAGER = require("./../modules/serversManager");
const ACCOUNTS_MANAGER = require("./../modules/accountsManager");
const PREDEFINED = require("./../modules/predefined");
const COMMONS = require("./../modules/commons");
const WEBSERVER = require("./../modules/webserver");

const express = require("express");
const router = express.Router();
const fs = require("fs");
const {Base64} = require("js-base64");
const Jimp = require("jimp");
const path = require("path");

// Router для получения списка серверов
router.get("/", function (req, res) {
    let preparedList = SERVERS_MANAGER.getServersList();
    if (mainConfig.authorization === true) {
        let uData = ACCOUNTS_MANAGER.getUserData(req.cookies["kbk__login"]);
        if (ACCOUNTS_MANAGER.getUserData(req.cookies["kbk__login"]).serversAccessRestricted === true) {
            let newList = [];
            uData.serversAllowed.forEach((server) => {
                if (preparedList.includes(server)) {
                    newList.push(server);
                }
            });
            return res.send(newList);
        }
    }
    res.send(preparedList);
});

// Router для создания нового сервера
router.get("/new", function (req, res) {
    let q = req.query;
    q.gameType = "minecraft";
    q.minecraftType = "java";
    if (q.gameType === "minecraft" && q.minecraftType === "java") {
        if (COMMONS.isObjectsValid(q.server, q.core, q.coreVersion, q.startParameters, q.javaVersion, q.port)) {
            SERVERS_GENERATOR.prepareJavaForServer(q.javaVersion, (javaExecutablePath) => {
                SERVERS_GENERATOR.startJavaServerGeneration(q.server, q.core, q.coreVersion, q.startParameters, javaExecutablePath, q.port, (genResult) => {
                    res.send(genResult);
                });
            })
        } else {
            res.sendStatus(400);
        }
    } else {
        res.sendStatus(400);
    }
});

// Router для получения лога сервера
router.get("/:server/log", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server)) {
        if (COMMONS.isObjectsValid(instancesLogs[q.server])) {
            res.send(SERVERS_CONTROLLER.getServerLog(q.server));
        } else {
            res.send("");
        }
        return;
    }
    res.sendStatus(400);
});

// Router для запуска сервера
router.get("/:server/start", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.startServer(q.server));
    }
    res.sendStatus(400);
});

// Router для перезапуска сервера
router.get("/:server/restart", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.restartServer(q.server));
    }
    res.sendStatus(400);
});

// Router для остановки сервера
router.get("/:server/stop", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.stopServer(q.server));
    }
    res.sendStatus(400);
});

// Router для принудительного завершения сервера
router.get("/:server/kill", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.killServer(q.server));
    }
    res.sendStatus(400);
});

// Router для отправки команд на сервер
router.get("/:server/send", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let q2 = req.query;
    if (COMMONS.isObjectsValid(q.server, q2.cmd)) {
        return res.send(SERVERS_CONTROLLER.writeToStdin(q.server, q2.cmd));
    }
    res.sendStatus(400);
});

// Router для получения иконки сервера
router.get("/:server/icon", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        let iconPath = "./servers/" + q.server + "/server-icon.png";
        if (fs.existsSync(iconPath)) {
            // Если есть файл иконки, то отправляем его
            res.sendFile(iconPath, {
                root: "./",
            });
        } else {
            // Если нет файла, то отправляем заготовленную иконку
            let image = Buffer.from(PREDEFINED.DEFAULT_KUBEK_ICON, "base64");
            res.writeHead(200, {
                "Content-Type": "image/png",
                "Content-Length": image.length,
            });
            res.end(image);
        }
        return;
    }
    res.sendStatus(400);
});

// Router для смены иконки сервера
router.post("/:server/icon", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let sourceFile, sourceExt;
    // Проверяем присутствие файлов в запросе
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
    }

    sourceFile = req.files["server-icon-input"];
    sourceExt = path.extname(sourceFile.name);

    COMMONS.moveUploadedFile(q.server, sourceFile, "/server-icon-PREPARED" + sourceExt, (result) => {
        if (result === true) {
            Jimp.read("./servers/" + q.server + "/server-icon-PREPARED" + sourceExt, (err, file) => {
                if (err) throw err;
                file
                    .resize(64, 64) // resize
                    .write("./servers/" + q.server + "/server-icon.png");
                return res.send(true);
            });
        } else {
            res.sendStatus(400);
        }
    })
});

// Router для получения информации о сервере
router.get("/:server/info", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_MANAGER.getServerInfo(q.server));
    }
    return res.sendStatus(400);
});

// Router для записи информации о сервере
router.put("/:server/info", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let q2 = req.query;
    if (COMMONS.isObjectsValid(q.server, q2.data) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_MANAGER.writeServerInfo(q.server, JSON.parse(Base64.decode(q2.data))));
    }
    res.sendStatus(400);
});

// Router для получения информации о сервере
router.get("/:server/query", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server) && SERVERS_MANAGER.getServerStatus(q.server) === PREDEFINED.SERVER_STATUSES.RUNNING) {
        SERVERS_CONTROLLER.queryServer(q.server, (queryResult) => {
            res.send(queryResult);
        });
    } else {
        res.sendStatus(400);
    }
});

// Router для получения скрипта запуска
router.get("/:server/startScript", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.getStartScript(q.server));
    }
    res.sendStatus(400);
});

// Router для записи скрипта запуска
router.put("/:server/startScript", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let q2 = req.query;
    // DEVELOPED by seeeroy
    if (COMMONS.isObjectsValid(q.server, q2.data) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.setStartScript(q.server, Base64.decode(q2.data)));
    }
    res.sendStatus(400);
});

// Router для получения server.properties
router.get("/:server/server.properties", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.getServerProperties(q.server));
    }
    res.sendStatus(400);
});

// Router для записи server.properties
router.put("/:server/server.properties", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let q2 = req.query;
    if (COMMONS.isObjectsValid(q.server, q2.data) && SERVERS_MANAGER.isServerExists(q.server)) {
        return res.send(SERVERS_CONTROLLER.saveServerProperties(q.server, Base64.decode(q2.data)));
    }
    res.sendStatus(400);
});

// Router для удаления сервера
router.delete("/:server", (req, res) => {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server)) {
        return res.send(SERVERS_MANAGER.deleteServer(q.server));
    }
    res.sendStatus(400);
});

module.exports.router = router;