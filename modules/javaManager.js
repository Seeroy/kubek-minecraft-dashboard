const COMMONS = require('./commons');
const PREDEFINED = require('./predefined');

const path = require("path");
const fs = require("fs");

// Конвертировать версию игры в требуемую версию Java
// DEPRECATED
exports.gameVersionToJava = (version) => {
    let sec = parseInt(version.split(".")[1]);
    let ter = parseInt(version.split(".")[2]);
    if (sec < 8) {
        return 8;
    } else if (sec >= 8 && sec <= 11) {
        return 11;
    } else if (sec >= 12 && sec <= 15) {
        return 11;
    } else if (sec === 16) {
        if (ter <= 4) {
            return 11;
        } else {
            return 16;
        }
    } else if (sec >= 17) {
        return 18;
    } else if (sec >= 20) {
        return 20;
    }
};

// Получить список доступных на сервере версий Java
exports.getDownloadableJavaVersions = (cb) => {
    COMMONS.getDataByURL(PREDEFINED.JAVA_LIST_URL, (data) => {
        if (data !== false) {
            let availReleases = data.available_releases;
            availReleases.forEach((release, i) => {
                availReleases[i] = release.toString();
            });
            cb(availReleases);
            return;
        }
        cb(false);
    });
};

// Получить список доступных Kubek`у локальных версий Java
exports.getLocalJavaVersions = () => {
    let startPath = "./binaries/java";
    let rdResult = fs.readdirSync(startPath);
    rdResult = rdResult.filter(entry => fs.lstatSync(startPath + path.sep + entry).isDirectory());
    return rdResult;
};

// Получить информацию о Java по версии
exports.getJavaInfoByVersion = (javaVersion) => {
    let platformName = "";
    let fileExtension = "";
    let platformArch = "";

    if (process.platform === "win32") {
        platformName = "windows";
        fileExtension = ".zip";
    } else if (process.platform === "linux") {
        platformName = "linux";
        fileExtension = ".tar.gz";
    } else {
        return false;
    }

    if (process.arch === "x64") {
        platformArch = "x64";
    } else if (process.arch === "x32") {
        platformArch = "x86";
    } else {
        return false;
    }

    let resultURL =
        "https://api.adoptium.net/v3/binary/latest/" +
        javaVersion +
        "/ga/" +
        platformName +
        "/" +
        platformArch +
        "/jdk/hotspot/normal/eclipse?project=jdk";
    let filename = "Java-" + javaVersion + "-" + platformArch + fileExtension;
    return {
        url: resultURL,
        filename: filename,
        version: javaVersion,
        platformArch: platformArch,
        platformName: platformName,
        downloadPath: "." + path.sep + "binaries" + path.sep + "java" + path.sep + filename,
        unpackPath: "." + path.sep + "binaries" + path.sep + "java" + path.sep + javaVersion + path.sep
    }
};

// Получить путь к скачанной версии Java (возвращает false, если версия не существует)
exports.getJavaPath = (javaVersion) => {
    let javaDirPath = "." + path.sep + "binaries" + path.sep + "java" + path.sep + javaVersion;
    let javaSearchPath1 = javaDirPath + path.sep + "bin" + path.sep + "java";
    if(process.platform === "win32"){
        javaSearchPath1 += ".exe";
    }
    if (fs.existsSync(javaDirPath) && fs.lstatSync(javaDirPath).isDirectory()) {
        if (fs.existsSync(javaSearchPath1)) {
            return javaSearchPath1;
        } else {
            let javaReaddir = fs.readdirSync(javaDirPath);
            if (fs.readdirSync(javaDirPath).length === 1) {
                let javaChkPath = javaDirPath + path.sep + javaReaddir[0] + path.sep + "bin" + path.sep + "java";
                if(process.platform === "win32"){
                    javaChkPath += ".exe";
                }
                if (fs.existsSync(javaChkPath)) {
                    return javaChkPath;
                }
            }
        }
    }
    return false;
}