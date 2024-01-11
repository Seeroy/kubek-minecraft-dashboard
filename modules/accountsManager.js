const CONFIGURATION = require("./configuration");
const PREDEFINED = require("./predefined");
const SECURITY = require("./security");
const SHA256 = require("crypto-js/sha256");

// Функция для добавления нового аккаунта с проверками
exports.createNewAccount = (login, password, permissions = [], email = "", servers = []) => {
    CONFIGURATION.reloadAllConfigurations();
    if (login !== "kubek" && !SECURITY.isUserExists(login)) {
        if (login.match(PREDEFINED.LOGIN_REGEX) != null && password.match(PREDEFINED.PASSWORD_REGEX) != null) {
            if (email === "" || email.match(PREDEFINED.EMAIL_REGEX) != null) {
                // Создаём недостающие переменные
                let serversRestricted = false;
                let userHash = crypto.randomUUID().toString();
                if (servers.length > 0) {
                    serversRestricted = true;
                }
                // Добавляем стандартный permission
                permissions.push(PREDEFINED.PERMISSIONS.DEFAULT);
                // Добавляем пользователя в конфиг и сохраняем
                usersConfig[login] = {
                    username: login,
                    password: SHA256(password).toString(),
                    secret: userHash,
                    permissions: permissions,
                    email: email,
                    serversAccessRestricted: serversRestricted,
                    serversAllowed: servers
                }
                CONFIGURATION.writeUsersConfig(usersConfig);
                return true;
            }
        }
    }
    return false;
};

// Функция для обновления данных аккаунта
exports.updateAccount = (login, password = "", permissions = [], email = "", servers = []) => {
    CONFIGURATION.reloadAllConfigurations();
    if (login.match(PREDEFINED.LOGIN_REGEX) != null && SECURITY.isUserExists(login)) {
        if (email === "" || email.match(PREDEFINED.EMAIL_REGEX) != null) {
            if (password === "" || password.match(PREDEFINED.PASSWORD_REGEX) != null) {
                // Создаём недостающие переменные
                let serversRestricted = false;
                if (servers.length > 0) {
                    serversRestricted = true;
                }
                // Добавляем стандартный permission
                permissions.push(PREDEFINED.PERMISSIONS.DEFAULT);
                // Обновляем конфиг пользователя
                usersConfig[login].permissions = permissions;
                usersConfig[login].email = email;
                usersConfig[login].serversAccessRestricted = serversRestricted;
                usersConfig[login].serversAllowed = servers;
                if (password !== "") {
                    usersConfig[login].password = SHA256(password).toString();
                    usersConfig[login].secret = crypto.randomUUID().toString();
                }
                CONFIGURATION.writeUsersConfig(usersConfig);
                return true;
            }
        }
    }
    return false;
}

// Пересоздать хеш пользователя
exports.regenUserHash = (login) => {
    CONFIGURATION.reloadAllConfigurations();
    if (SECURITY.isUserExists(login)) {
        usersConfig[login].secret = crypto.randomUUID().toString();
        CONFIGURATION.writeUsersConfig(usersConfig);
        return true;
    }
    return false;
};

// Сменить пароль пользователя
exports.changePassword = (login, password) => {
    CONFIGURATION.reloadAllConfigurations();
    if (SECURITY.isUserExists(login)) {
        usersConfig[login].password = SHA256(password).toString();
        this.regenUserHash(login);
        CONFIGURATION.writeUsersConfig(usersConfig);
        return true;
    }
    return false;
};

// Удалить пользователя
exports.deleteUser = (login) => {
    CONFIGURATION.reloadAllConfigurations();
    if (login !== "kubek" && SECURITY.isUserExists(login)) {
        usersConfig[login] = null;
        delete usersConfig[login];
        CONFIGURATION.writeUsersConfig(usersConfig);
        return true;
    }
    return false;
};

// Получить информацию о пользователе
exports.getUserData = (login) => {
    if (SECURITY.isUserExists(login)) {
        return usersConfig[login];
    }
    return false;
};

// Получить список пользователей
exports.getUsersList = () => {
    CONFIGURATION.reloadAllConfigurations();
    return Object.keys(usersConfig);
};

// DEVELOPED by seeeroy