let currentServerStatus = KubekPredefined.SERVER_STATUSES.STOPPED;

class KubekServerHeaderUI {
    // Обновить хидер сервера
    static refreshServerHeader = (cb) => {
        this.loadServerByName(selectedServer, cb);
    }

    // Загрузить сервер в хидер по названию
    static loadServerByName = (server, cb = () => {
    }) => {
        KubekServers.getServerInfo(server, (data) => {
            if (data.status !== false) {
                $(".content-header > .caption").text(server);
                this.setServerStatus(data.status);
                $(".content-header .icon-bg img").attr(
                    "src",
                    "/api/servers/" + server + "/icon?" + Date.now()
                );
                cb(true);
            } else {
                cb(false);
            }
        });
    }

    // Установить статус сервера в хидер
    static setServerStatus = (status) => {
        if (typeof KubekPredefined.SERVER_STATUSES_TRANSLATE[status] !== "undefined") {
            currentServerStatus = status;
            $(".content-header .status .text").text(KubekPredefined.SERVER_STATUSES_TRANSLATE[status]);
            $(".content-header .status .circle").removeClass("red yellow green");
            $(".content-header .hide-on-change").hide();
            $(".content-header #server-more-btn").hide();
            if (status === KubekPredefined.SERVER_STATUSES.STARTING || status === KubekPredefined.SERVER_STATUSES.STOPPING) {
                $(".content-header .status .circle").addClass("yellow");
                $(".content-header #server-more-btn").show();
            } else if (status === KubekPredefined.SERVER_STATUSES.RUNNING) {
                $(".content-header .status .circle").addClass("green");
                $(".content-header #server-restart-btn").show();
                $(".content-header #server-stop-btn").show();
                $(".content-header #server-more-btn").show();
            } else if (status === KubekPredefined.SERVER_STATUSES.STOPPED) {
                $(".content-header .status .circle").addClass("red");
                $(".content-header #server-start-btn").show();
            }
        } else {
            return false;
        }
        return true;
    }

    // Генератор пунктов для дропдауна
    static generateDropdown = (elem) => {
        let drpDataPool = [
            {
                "text": "{{commons.kill}}",
                "icon": "dangerous",
                "data": "kill"
            }
        ];
        if (currentServerStatus !== KubekPredefined.SERVER_STATUSES.STOPPED) {
            let elemPos = elem.getBoundingClientRect();
            KubekDropdowns.addDropdown(drpDataPool, elemPos.left, elemPos.top + 64, 3, (clickResult) => {
                if (clickResult === "kill") {
                    KubekRequests.get("/servers/" + selectedServer + "/kill");
                }
            });
        }
    }
}