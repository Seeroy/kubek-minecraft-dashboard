const LOGGER = require("./logger");
const PREDEFINED = require("./predefined");
const COMMONS = require("./commons");
const SECURITY = require("./security");
const FILE_MANAGER = require("./fileManager");
const MULTILANG = require("./multiLanguage");

const fs = require("fs");
const express = require('express');
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const colors = require('colors');
const mime = require("mime");
const path = require('path');
const {isInSubnet} = require('is-in-subnet');

global.webServer = express();
global.webPagesPermissions = {};
webServer.use(cookieParser());
webServer.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp/",
    })
);

// Получаем порт веб-сервера из конфига
let webPort = mainConfig.webserverPort;

// Функция для показа запроса в логах
exports.logWebRequest = (req, res, username = null) => {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
    let additionalInfo2 = "";
    if (username !== null) {
        additionalInfo2 = "[" + colors.cyan(username) + "]"
    }
    LOGGER.log("[" + colors.yellow(ip) + "]", additionalInfo2, colors.green(req.method) + " - " + req.originalUrl);
};

// Middleware для всех роутеров
exports.authLoggingMiddleware = (req, res, next) => {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");

    // Проверяем существование куков у пользователя на предмет логина
    let username = null;
    if (SECURITY.isUserHasCookies(req) && mainConfig.authorization === true) {
        username = req.cookies["kbk__login"];
    }

    // Показываем запрос в логах
    if (!COMMONS.testForRegexArray(req.path, PREDEFINED.NO_LOG_URLS)) {
        this.logWebRequest(req, res, username);
    }

    // Добавляем проверку на вхождение IP в range (при включенной функции)
    if (mainConfig.allowOnlyIPsList === true && !isInSubnet(ip, mainConfig.IPsAllowed)) {
        return; // При простом return на запрос не будет ответа, т.е. запрос просто зависнет
    }

    // Проверяем включена ли авторизация и есть ли у пользователя доступ к серверу
    if (mainConfig.authorization === true && !COMMONS.testForRegexArray(req.originalUrl, PREDEFINED.SKIP_AUTH_URLS)) {
        if (SECURITY.isUserHasCookies(req) && SECURITY.authenticateUser(req.cookies["kbk__login"], req.cookies["kbk__hash"])) {
            return next();
        } else {
            return res.redirect("/login.html");
        }
    } else {
        return next();
    }

    // Если ни один из этапов ранее не пропустил запрос дальше
    return res.sendStatus(403);
};

// Middleware для статических страниц
exports.staticsMiddleware = (req, res, next) => {
    let filePath = path.join(__dirname, "./../web", req.path);
    let ext = path.extname(req.path).replace(".", "").toLowerCase();
    if (req.path === "/") {
        filePath = path.join(__dirname, "./../web", "/index.html");
        ext = "html";
    }
    if (PREDEFINED.ALLOWED_STATIC_EXTS.includes(ext) && FILE_MANAGER.verifyPathForTraversal(filePath) && fs.existsSync(filePath)) {
        // Если все проверки пройдены - детектим и отправляем content-type
        res.set(
            "content-type",
            mime.getType(filePath)
        );
        let fileData = fs.readFileSync(filePath);
        // Переводим файл, если нужно
        if (PREDEFINED.TRANSLATION_STATIC_EXTS.includes(ext)) {
            fileData = MULTILANG.translateText(currentLanguage, fileData);
        }
        // Возвращаем файл
        return res.send(fileData);
    }
    return next();
};

// Middleware для проверки на доступ к серверу (ставится ко всем роутерам!)
exports.serversRouterMiddleware = (req, res, next) => {
    // Если авторизация отключена
    if (mainConfig.authorization === false) {
        return next();
    }

    let chkValue = false;
    if (COMMONS.isObjectsValid(req.params.server)) {
        chkValue = req.params.server;
    } else if (COMMONS.isObjectsValid(req.query.server)) {
        chkValue = req.query.server;
    }

    // Если проверка не требуется
    if (chkValue === false) {
        return next();
    }

    if (SECURITY.isUserHasCookies(req) && SECURITY.isUserHasServerAccess(req.cookies["kbk__login"], chkValue)) {
        return next();
    }
    return res.sendStatus(403);
}

// Функция для загрузки всех роутеров из списка в predefined
exports.loadAllDefinedRouters = () => {
    require("./permissionsMiddleware");
    webServer.use(this.authLoggingMiddleware);
    webServer.use(this.staticsMiddleware);

    let coresRouter = require("./../routers/cores.js");
    webServer.use("/api/cores", coresRouter.router);

    let tasksRouter = require("./../routers/tasks.js");
    webServer.use("/api/tasks", tasksRouter.router);

    let fileManagerRouter = require("./../routers/fileManager.js");
    webServer.use("/api/fileManager", fileManagerRouter.router);

    let serversRouter = require("./../routers/servers.js");
    webServer.use("/api/servers", serversRouter.router);

    let modsRouter = require("./../routers/mods.js");
    webServer.use("/api/mods", modsRouter.router);

    let pluginsRouter = require("./../routers/plugins.js");
    webServer.use("/api/plugins", pluginsRouter.router);

    let javaRouter = require("./../routers/java.js");
    webServer.use("/api/java", javaRouter.router);

    let authRouter = require("./../routers/auth.js");
    webServer.use("/api/auth", authRouter.router);

    let accountsRouter = require("./../routers/accounts.js");
    webServer.use("/api/accounts", accountsRouter.router);

    let kubekRouter = require("./../routers/kubek.js");
    webServer.use("/api/kubek", kubekRouter.router);

    let updatesRouter = require("./../routers/updates.js");
    webServer.use("/api/updates", updatesRouter.router);

    // Хэндлер для ошибки 404
    webServer.use((req, res) => {
        if (!res.headersSent) {
            let errFile = fs.readFileSync(path.join(__dirname, "./../web/404.html")).toString();
            return res.status(404).send(errFile);
        }
    });
};

// Запустить веб-сервер на выбранном порту
exports.startWebServer = () => {
    webServer.listen(webPort, () => {
        LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.webserverStarted}}", colors.cyan(webPort)));
    });
};