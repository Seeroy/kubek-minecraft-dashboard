const PREDEFINED = require("./../modules/predefined");
const ACCOUNTS_MANAGER = require("./../modules/accountsManager");
const COMMONS = require("./../modules/commons");

const express = require("express");
const SHA256 = require("crypto-js/sha256");
const router = express.Router();

// Endpoint для получения списка аккаунтов
router.get("/", function (req, res) {
    res.send(ACCOUNTS_MANAGER.getUsersList());
});

// Endpoint для получения информации об аккаунте
router.get("/:login", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.login)) {
        return res.send(ACCOUNTS_MANAGER.getUserData(q.login));
    }
    res.sendStatus(400);
});

// Endpoint для удаления аккаунта
router.delete("/:login", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.login)) {
        return res.send(ACCOUNTS_MANAGER.deleteUser(q.login));
    }
    res.sendStatus(400);
});

// Endpoint для регенерации хеша
router.get("/:login/regenHash", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.login)) {
        return res.send(ACCOUNTS_MANAGER.regenUserHash(q.login));
    }
    res.sendStatus(400);
});

// Endpoint для смены пользовательского пароля
router.put("/:login/password", function (req, res) {
    let q = req.params;
    let q2 = req.query;

    if (q.login !== "kubek") {
        if (COMMONS.isObjectsValid(q.login, q2.newPassword)) {
            return res.send(ACCOUNTS_MANAGER.changePassword(q.login, q2.newPassword));
        }
    } else {
        if (COMMONS.isObjectsValid(q.login, q2.oldPassword, q2.newPassword)) {
            let getKubekPwd = ACCOUNTS_MANAGER.getUserData("kubek").password;
            if (getKubekPwd === SHA256(q2.oldPassword).toString()) {
                return res.send(ACCOUNTS_MANAGER.changePassword(q.login, q2.newPassword));
            } else {
                return res.send(false);
            }
        }
    }
    res.sendStatus(400);
});

// Endpoint для создания пользователя
router.put("/", function (req, res) {
    let q2 = req.query;
    let permSplit = [];
    let serversAllowed = [];
    if (COMMONS.isObjectsValid(q2.login, q2.password, q2.permissions)) {
        // Конвертируем permissions в массив
        permSplit = q2.permissions.split(",");
        // Конвертируем servers в массив
        if (COMMONS.isObjectsValid(q2.servers)) {
            serversAllowed = q2.servers.split(",");
        }
        // Проверяем валидность email
        if (!COMMONS.isObjectsValid(q2.email)) {
            q2.email = "";
        }
        return res.send(ACCOUNTS_MANAGER.createNewAccount(q2.login, q2.password, permSplit, q2.email, serversAllowed));
    }
    res.sendStatus(400);
});

// Endpoint для изменения пользователя
router.put("/:login", function (req, res) {
    let q = req.params;
    let q2 = req.query;
    let permSplit = [];
    let serversAllowed = [];
    if (COMMONS.isObjectsValid(q.login, q2.permissions)) {
        // Конвертируем permissions в массив
        permSplit = q2.permissions.split(",");
        // Конвертируем servers в массив
        // DEVELOPED by seeeroy
        if (COMMONS.isObjectsValid(q2.servers)) {
            serversAllowed = q2.servers.split(",");
        }
        // Проверяем валидность email
        if (!COMMONS.isObjectsValid(q2.email)) {
            q2.email = "";
        }
        // Проверяем валидность пароля
        if (!COMMONS.isObjectsValid(q2.password)) {
            q2.password = "";
        }
        return res.send(ACCOUNTS_MANAGER.updateAccount(q.login, q2.password, permSplit, q2.email, serversAllowed));
    }
    res.sendStatus(400);
});

module.exports.router = router;