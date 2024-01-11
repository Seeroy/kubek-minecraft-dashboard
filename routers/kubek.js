const HARDWARE_MANAGER = require("./../modules/hardwareManager");
const CONFIGURATION = require("./../modules/configuration");
const COMMONS = require("./../modules/commons");
const FTP_DAEMON = require("./../modules/ftpDaemon");
const MULTILANG = require("./../modules/multiLanguage");

const express = require("express");
const router = express.Router();
const {Base64} = require("js-base64");
const packageJSON = require("../package.json");

// Endpoint для получения использования ресурсов
router.get("/hardware/usage", function (req, res) {
    HARDWARE_MANAGER.getResourcesUsage((result) => {
        res.send(result);
    })
});

// Endpoint для получения всей информации о hardware
router.get("/hardware", function (req, res) {
    HARDWARE_MANAGER.getHardwareInfo((result) => {
        res.send(result);
    })
});

// Endpoint для получения версии Kubek
router.get("/version", function (req, res) {
    res.send(packageJSON.version);
});

// Endpoint для получения настроек Kubek
router.get("/settings", function (req, res) {
    res.send(mainConfig);
});

// Endpoint для сохранения настроек Kubek
router.put("/settings", function (req, res) {
    let q = req.query;
    if (COMMONS.isObjectsValid(q.config)) {
        if(FTP_DAEMON.isFTPStarted()){
            FTP_DAEMON.stopFTP();
        }
        let writeResult = CONFIGURATION.writeMainConfig(Base64.decode(q.config));
        CONFIGURATION.reloadAllConfigurations();
        global.currentLanguage = mainConfig.language;
        FTP_DAEMON.startFTP();
        return res.send(writeResult);
    }
    res.sendStatus(400);
});

// Endpoint для соглашения с EULA
router.get("/eula/accept", function (req, res) {
    mainConfig.eulaAccepted = true;
    CONFIGURATION.writeMainConfig(mainConfig);
    CONFIGURATION.reloadAllConfigurations();
    res.send(true);
});

// Endpoint для получения списка языков
router.get("/languages", function (req, res) {
    res.send(avaliableLanguages);
});

module.exports.router = router;