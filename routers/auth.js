const SECURITY = require("./../modules/security");
const SERVERS_MANAGER = require("./../modules/serversManager");
const MULTI_LANGUAGE = require("./../modules/multiLanguage");
const COMMONS = require("./../modules/commons");

const express = require("express");
const router = express.Router();

// Endpoint для входа в систему
router.get("/login/:login/:password", function (req, res) {
    let q = req.params;
    // Если авторизация отключена в конфигурации
    if (mainConfig.authorization === false) {
        return res.send({
            success: false,
            error: MULTI_LANGUAGE.translateText(currentLanguage, "{{security.authDisabled}}")
        });
    }
    if (COMMONS.isObjectsValid(q.login, q.password)) {
        let authUser = SECURITY.authorizeUser(q.login, q.password);
        if (authUser) {
            let options = {
                maxAge: 120 * 24 * 60 * 60 * 1000,
                httpOnly: true,
            };
            res.cookie("kbk__hash", usersConfig[q.login].secret, options);
            res.cookie("kbk__login", usersConfig[q.login].username, options);
            return res.send({
                success: true
            });
        }
        return res.send({
            success: false,
            error: MULTI_LANGUAGE.translateText(currentLanguage, "{{security.wrongCredentials}}")
        });
    }
    res.sendStatus(400);
});

// Endpoint для получения списка своих прав
router.get("/permissions", function (req, res) {
    if (SECURITY.isUserHasCookies(req)) {
        return res.send(SECURITY.getUserDataByUsername(req.cookies["kbk__login"]).permissions);
    }
    res.sendStatus(403);
});

// Endpoint для получения списка своих доступных серверов
router.get("/servers", function (req, res) {
    if (SECURITY.isUserHasCookies(req)) {
        let usrObject = SECURITY.getUserDataByUsername(req.cookies["kbk__login"]);
        if (usrObject !== false) {
            if (usrObject.serversAccessRestricted === true) {
                res.send(usrObject.serversAllowed);
            } else {
                res.send(SERVERS_MANAGER.getServersList());
            }
            return;
        }
    }
    res.sendStatus(403);
});

// Endpoint для получения своего логина
router.get("/login", function (req, res) {
    if (SECURITY.isUserHasCookies(req)) {
        return res.send(req.cookies["kbk__login"]);
    }
    res.sendStatus(403);
});

// Endpoint для выхода из аккаунта
router.get("/logout", function (req, res) {
    if (SECURITY.isUserHasCookies(req)) {
        res.clearCookie("kbk__login");
        res.clearCookie("kbk__hash");
        return res.send({
            success: true
        })
    }
    res.send({
        success: false
    })
});

// Endpoint для проверки, включена ли авторизация (для скрытия badge в хидере)
router.get("/isEnabled", (req, res) => {
    res.send(mainConfig.authorization);
});

module.exports.router = router;