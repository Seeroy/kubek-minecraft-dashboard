const COMMONS = require("./../modules/commons");
const FILE_MANAGER = require("./../modules/fileManager");
const WEBSERVER = require("../modules/webserver");

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Endpoint сканирования директории или чтения файлов
router.get("/get", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        res.set("Content-Type", "application/json");
        FILE_MANAGER.readFile(q.server, q.path, (rdResult) => {
            // Если путь оказался файлом
            if (rdResult !== false) {
                res.send({
                    fileData: rdResult.toString()
                });
                return;
            }
            // Если путь оказался папкой
            FILE_MANAGER.scanDirectory(q.server, q.path, (dirRdResult) => {
                res.send(dirRdResult);
            });
        });
    } else {
        res.sendStatus(400);
    }
});

// Endpoint для начала записи файла
router.get("/chunkWrite/start", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        return res.send(FILE_MANAGER.startChunkyFileWrite(q.server, q.path));
    }
    res.sendStatus(400);
});

// Endpoint для записи чанка в файл
router.get("/chunkWrite/add", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.id, q.data)) {
        return res.send(FILE_MANAGER.addFileChunk(q.id, q.data));
    }
    res.sendStatus(400);
});

// Endpoint для окончания записи чанков и сохранения в файл
router.get("/chunkWrite/end", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.id)) {
        return res.send(FILE_MANAGER.endChunkyFileWrite(q.id));
    }
    res.sendStatus(400);
});

// Endpoint для удаления
router.get("/delete", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        res.set("Content-Type", "application/json");
        let fileDeleteResult = FILE_MANAGER.deleteFile(q.server, q.path);
        let directoryDeleteResult = FILE_MANAGER.deleteEmptyDirectory(q.server, q.path);
        return res.send(fileDeleteResult || directoryDeleteResult);
    }
    res.sendStatus(400);
});

// Endpoint для переименования
router.get("/rename", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path, q.newName)) {
        res.set("Content-Type", "application/json");
        return res.send(FILE_MANAGER.renameFile(q.server, q.path, q.newName));
    }
    res.sendStatus(400);
});

// Endpoint для создания новой директории
router.get("/newDirectory", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path, q.name)) {
        res.set("Content-Type", "application/json");
        return res.send(FILE_MANAGER.newDirectory(q.server, q.path, q.name));
    }
    res.sendStatus(400);
});

// Endpoint для скачивания файла
router.get("/download", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;

    if (COMMONS.isObjectsValid(q.server, q.path)) {
        let fPath = FILE_MANAGER.constructFilePath(q.server, q.path);
        if (fs.existsSync(fPath) && !fs.lstatSync(fPath).isDirectory()) {
            return res.download(path.resolve(fPath));
        }
    }
    res.sendStatus(400);
});

// Endpoint для загрузки файла на сервер
router.post("/upload", WEBSERVER.serversRouterMiddleware, function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.server, q.path)) {
        let sourceFile;
        // Проверяем присутствие файлов в запросе
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send("No files were uploaded.");
        }

        sourceFile = req.files["g-file-input"];

        COMMONS.moveUploadedFile(q.server, sourceFile, "/" + sourceFile.name, (result) => {
            if (result === true) {
                // DEVELOPED by seeeroy
                return res.send(true);
            }
            console.log(result);
            res.sendStatus(400);
        })
    } else {
        return res.sendStatus(400);
    }
});

module.exports.router = router;