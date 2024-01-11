class KubekPlugins {
    // Список плагинов
    static getPluginsList (cb) {
        KubekRequests.get("/plugins/" + selectedServer, cb);
    }

    // Список модов
    static getModsList(cb) {
        KubekRequests.get("/mods/" + selectedServer, cb);
    }
}