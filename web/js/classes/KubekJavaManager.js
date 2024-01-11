class KubekJavaManager {
    // Список пользовательских версий Java, установленных в системе
    static getLocalInstalledJava(cb){
        KubekRequests.get("/java", cb);
    }

    // Список версий Java, установленных в Kubek
    static getKubekInstalledJava(cb){
        KubekRequests.get("/java/kubek", cb);
    }

    // Список доступных для скачивания версий Java
    static getOnlineJava(cb){
        KubekRequests.get("/java/online", cb);
    }

    // Получить полный список Java
    static getAllJavas(cb){
        KubekRequests.get("/java/all", cb);
    }
}