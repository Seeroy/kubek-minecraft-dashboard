$(function () {
    KubekUI.setTitle("Kubek | {{sections.systemMonitor}}");

    KubekHardware.getSummary( (data) => {
        // Загружаем список переменных системы
        for (const [key, value] of Object.entries(data.enviroment)) {
            $("#enviroment-table").append(
                '<tr><th>' + key + '</th><td>' + value + '</td></td>'
            );
        }

        // Загружаем сетевые интерфейсы
        for (const [key, value] of Object.entries(data.networkInterfaces)) {
            let ips = "";
            value.forEach(function (inner) {
                ips =
                    ips + "<span>" + inner.address + " <sup>" + inner.family + "</sup></span><br>";
            });
            $("#networks-table").append(
                '<tr><th>' + key + '</th><td>' + ips + '</td></td>'
            );
        }

        // Загружаем диски
        data.disks.forEach((disk) => {
            let letter = disk["_mounted"];
            let total = disk["_blocks"];
            let used = disk["_used"];
            let free = disk["_available"];

            if (data.platform.name === "Linux") {
                total = total * 1024;
                used = used * 1024;
                free = free * 1024;
            }
            total = KubekUtils.humanizeFileSize(total);
            used = KubekUtils.humanizeFileSize(used);
            free = KubekUtils.humanizeFileSize(free);
            let percent = disk["_capacity"];
            $("#disks-table").append(
                '<tr><th>' + letter + '</th><td>' + used + '</td><td>' + free + '</td><td>' + total + '</td><td>' + percent + '</td></tr>'
            );
        });

        // Загружаем остальные параметры
        $("#os-name").html(data.platform.version + " <sup>" + data.platform.arch + "</sup>");
        $("#os-build").text(data.platform.release);
        $("#total-ram").text(data.totalmem + " Mb");
        $("#kubek-uptime").text(KubekUtils.humanizeSeconds(data.uptime));
        $("#cpu-model").text(data.cpu.model + " (" + data.cpu.cores + " cores)");
        $("#cpu-speed").text(data.cpu.speed + " MHz");
    });
});