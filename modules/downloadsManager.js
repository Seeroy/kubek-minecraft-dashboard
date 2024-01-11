const TASK_MANAGER = require("./taskManager");
const PREDEFINED = require("./predefined");
const LOGGER = require("./logger");
const MULTILANG = require("./multiLanguage");

const path = require("path");
const axios = require("axios");
const fs = require("fs");
const decompress = require("decompress");
const colors = require("colors");

// Создать задачу на скачивание
async function addDownloadTask(downloadURL, filePath, cb = () => {
}) {
    // Создаём новый объект Axios
    const {data, headers} = await axios({
        url: downloadURL,
        method: "GET",
        responseType: "stream",
    }).catch((error) => {
        // Возвращаем коллбэк при ошибке
        cb(error);
    });

    // Создаём новую задачу и запоминаем её ID
    let dlTaskID = TASK_MANAGER.addNewTask({
        type: PREDEFINED.TASKS_TYPES.DOWNLOADING,
        progress: 0,
        size: {
            total: parseInt(headers['content-length']),
            current: 0
        },
        url: downloadURL,
        path: filePath,
        filename: path.basename(filePath)
    })

    LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.downloadTaskCreated}}", colors.cyan(dlTaskID), colors.cyan(path.basename(filePath))));

    // Каждый чанк обновляем прогресс
    data.on('data',(chunk) => {
        tasks[dlTaskID].size.current = tasks[dlTaskID].size.current + chunk.length;
        tasks[dlTaskID].progress = Math.round((tasks[dlTaskID].size.current / tasks[dlTaskID].size.total) * 100);
        if (tasks[dlTaskID].size.current === tasks[dlTaskID].size.total) {
            // Возвращаем коллбэк после окончания скачивания
            TASK_MANAGER.removeTask(dlTaskID);
            cb(true);
        }
    })

    data.pipe(fs.createWriteStream(filePath));
}

// Распаковать архив по нужному пути
exports.unpackArchive = (archivePath, unpackPath, cb, deleteAfterUnpack = false) => {
    fs.mkdirSync(unpackPath, {recursive: true});
    decompress(archivePath, unpackPath)
        .then(function () {
            if (deleteAfterUnpack) {
                fs.unlinkSync(archivePath);
            }
            cb(true);
        })
        .catch(function (error) {
            console.error(error);
            cb(false);
        });
}

module.exports.addDownloadTask = addDownloadTask;