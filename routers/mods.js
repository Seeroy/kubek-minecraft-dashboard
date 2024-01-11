const FILE_MANAGER = require("./../modules/fileManager");
const SERVERS_MANAGER = require("./../modules/serversManager");
const COMMONS = require("./../modules/commons");
const WEBSERVER = require("../modules/webserver");

const express = require("express");
const router = express.Router();

// Endpoint списка модов
router.get("/:server", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.server) && SERVERS_MANAGER.isServerExists(q.server)) {
        FILE_MANAGER.scanDirectory(q.server, "/mods", (result) => {
            if (result === false) {
                return res.send([]);
            }
            let resultArray = [];
            result.forEach((item) => {
                if (item.type === "file") {
                    resultArray.push(item.name);
                }
            });
            res.send(resultArray);
        });
    } else {
        res.sendStatus(400);
    }
});

// Endpoint для загрузки мода на сервер
router.post("/:server", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let sourceFile;
    // Проверяем присутствие файлов в запросе
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
    }

    sourceFile = req.files["server-mod-input"];

    COMMONS.moveUploadedFile(q.server, sourceFile, "/mods/" + sourceFile.name, (result) => {
        if (result === true) {
            return res.send(true);
        }
        console.log(result);
        res.sendStatus(400);
    })
});

// Endpoint удаления мода
router.delete("/:server", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let q2 = req.query;
    if (COMMONS.isObjectsValid(q.server, q2.plugin) && SERVERS_MANAGER.isServerExists(q.server)) {
        let delResult = FILE_MANAGER.deleteFile(q.server, "/mods/" + q2.plugin);
        return res.send(delResult);
    }
    res.sendStatus(400);
});

module.exports.router = router;