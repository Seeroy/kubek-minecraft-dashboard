const MULTILANG = require("./multiLanguage");
const LOGGER = require("./logger");

const ftpd = require("ftpd");
const colors = require("colors");
const path = require("path");
const defaultOptions = {
    host: "127.0.0.1",
    port: 21,
    tls: null
};

exports.startFTP = () => {
    let isEnabled = mainConfig.ftpd.enabled;
    if (isEnabled) {
        let initPath = path.normalize("./");
        let username = mainConfig.ftpd.username;
        let password = mainConfig.ftpd.password;
        let port = mainConfig.ftpd.port;
        // Запускаем сервер
        ftpDaemon = new ftpd.FtpServer(defaultOptions.host, {
            getInitialCwd: function (conn) {
                return "/";
            },
            getRoot: function () {
                return initPath;
            },
            pasvPortRangeStart: 1025,
            pasvPortRangeEnd: 1050,
            tlsOptions: defaultOptions.tls,
            allowUnauthorizedTls: true,
            useWriteFile: false,
            useReadFile: false,
            uploadMaxSlurpSize: 7000,
            allowedCommands: [
                "XMKD",
                "AUTH",
                "TLS",
                "SSL",
                "USER",
                "PASS",
                "PWD",
                "OPTS",
                "TYPE",
                "PORT",
                "PASV",
                "LIST",
                "CWD",
                "MKD",
                "SIZE",
                "STOR",
                "MDTM",
                "DELE",
                "QUIT",
                "EPSV",
                "RMD",
                "RETR",
                "RNFR",
                "RNTO",
            ],
        });

        // При ошибке в работе сервера
        ftpDaemon.on("error", function (error) {
            LOGGER.error(MULTILANG.translateText(mainConfig.language, "{{console.ftpError}}") + error.toString());
        });

        // При подключении клиента
        ftpDaemon.on("client:connected", function (connection) {
            LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.ftpNewConnection}}"));

            connection.on("command:user", function (user, success, failure) {
                if (user === username) {
                    success();
                } else {
                    failure();
                }
            });

            connection.on("command:pass", function (pass, success, failure) {
                if (pass === password) {
                    LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.ftpConnected}}") + colors.green(username));
                    /*tgbot.chatIdSave.forEach((chatId) => {
                        tgbot.bot.sendMessage(
                            chatId,
                            "🔒 [FTP] " +
                            translator.translateHTML(
                                "{{user}} <b>" + username + "</b> {{consolemsg-ftp-connect}}",
                                cfg["lang"]
                            ),
                            {
                                parse_mode: "html",
                            }
                        );
                    });*/
                    success(username);
                } else {
                    failure();
                }
            });
        });

        ftpDaemon.debugging = 0;
        ftpDaemon.listen(port);
        LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.ftpStarted}}") + colors.cyan(port));
        return true;
    }
};

// Остановить сервер
exports.stopFTP = () => {
    ftpDaemon.close();
    ftpDaemon = null;
    LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.ftpStopped}}"));
    return true;
}

// Запущен ли FTP-сервер
exports.isFTPStarted = () => {
    return ftpDaemon !== null;
};