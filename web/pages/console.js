consoleCpuUsageBar = new KubekCircleProgress($("#cpu-usage-bar"), 100, 100, "var(--bg-dark-accent)", "var(--bg-dark-accent-light)", "var(--bg-primary-500)");
consoleCpuUsageBar.create();
consoleRamUsageBar = new KubekCircleProgress($("#ram-usage-bar"), 100, 100, "var(--bg-dark-accent)", "var(--bg-dark-accent-light)", "var(--bg-primary-500)");
consoleRamUsageBar.create();
$("#ram-usage-bar").hide();
$("#cpu-usage-bar").hide();

KubekConsoleUI = class {
    // Обновить progress бары использования рес-ов
    static refreshUsageItems(cpu, ram, ramElem) {
        consoleCpuUsageBar.setValue(cpu);
        consoleRamUsageBar.setValue(ram);
        consoleCpuUsageBar.setActiveColor(KubekUtils.getProgressGradientColor(cpu));
        consoleRamUsageBar.setActiveColor(KubekUtils.getProgressGradientColor(ram));
        $("#ram-usage-text").text(KubekUtils.humanizeFileSize(ramElem.used) + " / " + KubekUtils.humanizeFileSize(ramElem.total));
        if ($("#cpu-usage-bar").css("display") === "none") {
            $("#cpu-usage-spinner").hide();
            $("#ram-usage-spinner").hide();
            $("#ram-usage-bar").show();
            $("#cpu-usage-bar").show();
        }
    }
}

$(function () {
    KubekUI.setTitle("Kubek | {{sections.console}}");

    KubekHardware.getUsage((usage) => {
        KubekConsoleUI.refreshUsageItems(usage.cpu, usage.ram.percent, usage.ram);
    });

    $("#cmd-input").on("keydown", (e) => {
        if (e.originalEvent.code === "Enter") {
            KubekServers.sendCommandFromInput(selectedServer);
        }
    });
})