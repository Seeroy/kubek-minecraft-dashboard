class KubekCoresManager {
    // Получить список всех ядер
    static getList(cb) {
        KubekRequests.get("/cores", cb);
    }

    // Получить список версий ядра
    static getCoreVersions(core, cb) {
        KubekRequests.get("/cores/" + core, cb);
    }

    // Получить ссылку на скачивание ядра
    static getCoreURL(core, version, cb) {
        KubekRequests.get("/cores/" + core + "/" + version, cb);
    }
}