const SHA256 = require("crypto-js/sha256");

// Проверить имеет ли пользователь определённое право
exports.isUserHasPermission = (username, permission) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(username);
    return userData !== false && userData.permissions.includes(permission);
};

// Проверить, имеет ли пользователь доступ к серверу
exports.isUserHasServerAccess = (username, server) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(username);
    if (userData !== false) {
        if (userData.serversAccessRestricted === false || userData.serversAllowed.includes(server)) {
            return true;
        }
    }
    return false;
};

// Авторизовать пользователя по логину и паролю
exports.authorizeUser = (login, password) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(login);
    return userData !== false && userData.password === SHA256(password).toString();
};

// Провести аутентификацию пользователя
exports.authenticateUser = (login, secret) => {
    if (mainConfig.authorization === false) {
        // Сразу разрешаем доступ, если авторизация отключена в конфигурации
        return true;
    }
    let userData = this.getUserDataByUsername(login);
    return userData !== false && userData.secret === secret;
};

// Получить данные пользователя из конфига по имени
exports.getUserDataByUsername = (username) => {
    for (const [, userData] of Object.entries(usersConfig)) {
        if (userData.username === username) {
            return userData;
        }
    }
    return false;
};

// Проверить существование куков у пользователя
exports.isUserHasCookies = (req) => {
    return typeof req.cookies["kbk__hash"] !== "undefined" && typeof req.cookies["kbk__login"] !== "undefined";
};

// Проверить существование пользователя
exports.isUserExists = (username) => {
    return this.getUserDataByUsername(username) !== false;
};