class KubekFileManager {
    // Получить содержимое папки
    static readDirectory(path, cb) {
        KubekRequests.get("/fileManager/get?server=" + selectedServer + "&path=" + path, cb);
    }

    // Переименовать файл
    static renameFile(path, newName, cb) {
        KubekRequests.get("/fileManager/rename?server=" + selectedServer + "&path=" + path + "&newName=" + newName, cb);
    }

    // Удалить файл/директорию
    static delete(path, cb) {
        KubekRequests.get("/fileManager/delete?server=" + selectedServer + "&path=" + path, cb);
    }

    // Создать новую директорию
    static newDirectory(path, name, cb) {
        KubekRequests.get("/fileManager/newDirectory?server=" + selectedServer + "&path=" + path + "&name=" + name, cb);
    }

    // Скачать файл
    static downloadFile(path, cb) {
        window.open("/api/fileManager/download?server=" + selectedServer + "&path=" + path, "_blank")
    }

    // Прочитать файл
    static readFile(path, cb) {
        this.readDirectory(path, (result) => {
            if (result === false) {
                cb(false);
            }
            cb(result.fileData);
        });
    }

    // Создать элемент для записи
    static startChunkWrite(path, cb){
        KubekRequests.get("/fileManager/chunkWrite/start?server=" + selectedServer + "&path=" + path, cb);
    }

    // Дополнить элемент для записи
    static addChunkWrite(id, data, cb){
        KubekRequests.get("/fileManager/chunkWrite/add?id=" + id + "&data=" + data, cb);
    }

    // Завершить элемент для записи
    static endChunkWrite(id, cb){
        KubekRequests.get("/fileManager/chunkWrite/end?id=" + id, cb);
    }
}