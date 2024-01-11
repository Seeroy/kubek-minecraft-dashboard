const PREDEFINED = require("./predefined");
const COMMONS = require("./commons");
const packageJSON = require("./../package.json");

global.cachedUpdate = null;

// Функция для получения объекта релизов с GitHub
exports.getGitHubReleases = (cb) => {
    COMMONS.getDataByURL(PREDEFINED.UPDATES_URL_API, cb);
};

// Получить последнюю версию из релизов на GitHub
exports.getLatestVersionOnGitHub = (cb) => {
    this.getGitHubReleases((ghReleases) => {
        if (ghReleases !== false) {
            if (typeof ghReleases !== "undefined" && typeof ghReleases[0] !== "undefined" && typeof ghReleases[0].tag_name !== "undefined") {
                cb({
                    version: ghReleases[0].tag_name.replace("v", ""),
                    url: ghReleases[0].html_url,
                    body: ghReleases[0].body
                });
            } else {
                cb(false);
            }
        } else {
            cb(false);
        }

    });
};

// Проверить обновления (возвращает false или ссылку на обновление)
exports.checkForUpdates = (cb) => {
    this.getLatestVersionOnGitHub((ghLatestVer) => {
        this.saveUpdateToCache(ghLatestVer);
        if (ghLatestVer !== false) {
            if (packageJSON.version !== ghLatestVer.version) {
                cb(ghLatestVer.url);
            } else {
                cb(false);
            }
        } else {
            cb(false);
        }
    });
};

// Сохранить обновление в кеш
exports.saveUpdateToCache = (latVer) => {
    if (latVer !== false && packageJSON.version !== latVer.version) {
        cachedUpdate = {
            hasUpdate: true,
            version: {
                current: packageJSON.version,
                new: latVer.version
            },
            url: latVer.url,
            body: latVer.body
        }
        return;
    }
    cachedUpdate = {
        hasUpdate: false
    }
};

// Получить информацию об обновлении из кеша
exports.getCachedUpdate = () => {
    if(cachedUpdate === null){
        return false;
    }
    return cachedUpdate;
}