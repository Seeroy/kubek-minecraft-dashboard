loadedSettings = null;

$(function () {
    KubekUI.setTitle("Kubek | {{sections.serverSettings}}");

    KubekServerSettingsUI.loadSettings();
    KubekServerSettingsUI.loadStartScript();
});

KubekServerSettingsUI = class {
    // Загрузить настройки в интерфейс
    static loadSettings = () => {
        KubekRequests.get("/servers/" + selectedServer + "/info", (kSettings) => {
            loadedSettings = kSettings;
            if (kSettings.restartOnError === false) {
                $("#restart-attempts-tr").hide();
            } else {
                $("#restart-on-error").attr("checked", true);
            }
            $("#stop-command").val(kSettings.stopCommand);
            $("#restart-attempts").val(kSettings.maxRestartAttempts);
        });
    }

    // Загрузить start script в интерфейс
    static loadStartScript = () => {
        KubekRequests.get("/servers/" + selectedServer + "/startScript", (startScript) => {
            $("#start-script").val(startScript);
        });
    }

    // Сохранить настройки и start script
    static writeSettings = () => {
        loadedSettings.maxRestartAttempts = $("#restart-attempts").val();
        loadedSettings.restartOnError = $("#restart-on-error").is(":checked");
        loadedSettings.stopCommand = $("#stop-command").val();
        let startScript = $("#start-script").val();
        KubekRequests.put("/servers/" + selectedServer + "/info?data=" + Base64.encodeURI(JSON.stringify(loadedSettings)), (result) => {
            KubekRequests.put("/servers/" + selectedServer + "/startScript?data=" + Base64.encodeURI(startScript), (result2) => {
                if (result !== false && result2 !== false) {
                    KubekAlerts.addAlert("{{fileManager.writeEnd}}", "check", "", 5000);
                }
            });
        });


    };
}

$("#restart-on-error").on("change", function () {
    if ($(this).is(":checked")) {
        $("#restart-attempts-tr").show();
    } else {
        $("#restart-attempts-tr").hide();
    }
});