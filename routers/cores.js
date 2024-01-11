const PREDEFINED = require("./../modules/predefined");
const CORES_MANAGER = require("./../modules/coresManager");
const COMMONS = require("./../modules/commons");
const WEBSERVER = require("../modules/webserver");

const express = require("express");
const router = express.Router();

// Endpoint списка ядер
router.get("/", function (req, res) {
    res.set("Content-Type", "application/json");
    res.send(PREDEFINED.SERVER_CORES);
});

// Endpoint списка версий конкретного ядра
router.get("/:core", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.core) && Object.keys(PREDEFINED.SERVER_CORES).includes(q.core)) {
        res.set("Content-Type", "application/json");
        CORES_MANAGER.getCoreVersions(q.core, (result) => {
            res.send(result);
        });
    } else {
        res.sendStatus(400);
    }
});

// Endpoint ссылки на выбранную версию ядра
router.get("/:core/:version", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.core, q.version) && Object.keys(PREDEFINED.SERVER_CORES).includes(q.core)) {
        CORES_MANAGER.getCoreVersionURL(q.core, q.version, (result) => {
            res.send(result);
        });
    } else {
        res.sendStatus(400);
    }
});

// Endpoint для загрузки ядра
router.post("/:server", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.params;
    let sourceFile;
    // Проверяем присутствие файлов в запросе
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
    }

    sourceFile = req.files["server-core-input"];

    COMMONS.moveUploadedFile(q.server, sourceFile, "/" + sourceFile.name, (result) => {
        if (result === true) {
            return res.send(true);
        }
        console.log(result);
        res.sendStatus(400);
    })
});

module.exports.router = router;