class KubekHardware {
    // Получить суммарную информацию о hardware
    static getSummary(cb){
        KubekRequests.get("/kubek/hardware/summary", cb);
    }

    // Получить информацию об использовании ЦПУ, памяти и тд
    static getUsage(cb){
        KubekRequests.get("/kubek/hardware/usage", cb);
    }
}