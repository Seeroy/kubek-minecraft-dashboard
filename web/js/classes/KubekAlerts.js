class KubekAlerts {
    // Функция для добавления нового алёрта
    static addAlert(text, icon = "info", description = "", duration = 5000, iconClasses = "", callback = () => {
    }) {
        let alertsPoolElement = $("#alerts-pool");
        let newID = this.generateAlertID();
        let alertCode = "<div id='alert-" + newID + "' class='alert animate__animate animate__fadeIn animate__faster'>";
        if (iconClasses !== "") {
            alertCode = alertCode + "<div class='icon-bg " + iconClasses + "'><span class='material-symbols-rounded'>" + icon + "</span></div>";
        } else {
            alertCode = alertCode + "<div class='icon-bg'><span class='material-symbols-rounded'>" + icon + "</span></div>";
        }
        if (description !== "") {
            alertCode = alertCode + "<div class='content-2'><div class='caption'>" + text + "</div><div class='description'>" + description + "</div></div>";
        } else {
            alertCode = alertCode + "<div class='caption'>" + text + "</div>";
        }
        alertCode = alertCode + "</div>";
        alertsPoolElement.append(alertCode);
        $("#alert-" + newID).on("click", function () {
            $(this).remove();
            callback();
        });
        if (duration > 0) {
            $("#alert-" + newID)
                .delay(duration)
                .queue(function () {
                    let rid = "#" + $(this)[0].id;
                    animateCSSJ(rid, "fadeOut", false).then(() => {
                        $(this).remove();
                    });
                });
        }
    }

    // Получить ID для нового alert`а
    static generateAlertID() {
        return $("#alerts-pool .alert").length;
    }

    // Удалить все алёрты
    static removeAllAlerts() {
        $("#alerts-pool").html("");
    }
}