// Загружаем нужные самописные модули
const COMMONS = require("./modules/commons");
const CONFIGURATION = require("./modules/configuration");

// Создаём нужные папки (если их не существует)
COMMONS.makeBaseDirs();

// Загружаем файлы конфигурации в глобальные переменные
CONFIGURATION.reloadAllConfigurations();
CONFIGURATION.migrateOldMainConfig();
CONFIGURATION.migrateOldServersConfig();

const LOGGER = require("./modules/logger");
const MULTI_LANGUAGE = require("./modules/multiLanguage");
const WEBSERVER = require("./modules/webserver");
const STATS_COLLECTION = require("./modules/statsCollection");
const FTP_DAEMON = require("./modules/ftpDaemon");

const collStats = STATS_COLLECTION.collectStats();
STATS_COLLECTION.sendStatsToServer(collStats, true);

// Загружаем доступные языки и ставим переменную с языком из конфига
MULTI_LANGUAGE.loadAvailableLanguages();
global.currentLanguage = mainConfig.language;

// Показываем приветствие
LOGGER.kubekWelcomeMessage();

WEBSERVER.loadAllDefinedRouters();
WEBSERVER.startWebServer();

// Запускаем FTP-сервер
global.ftpDaemon = null;
FTP_DAEMON.startFTP();

// Автоматически запустить сервера, которые были запущены при закрытии Kubek
CONFIGURATION.autoStartServers();