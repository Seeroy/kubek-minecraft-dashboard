class KubekUI {
    // Загрузить секцию в блок
    static loadSection = (name, container = "body", cb = () => {
    }) => {
        $.get("/sections/" + name + ".html", (code) => {
            $(container).append(code);
            cb();
        });
    }

    // Управление прелоудером
    static showPreloader() {
        $("body #main-preloader").show();
        animateCSSJ("body #main-preloader", "fadeIn").then(() => {
        });
    }

    static hidePreloader() {
        animateCSSJ("body #main-preloader", "fadeOut").then(() => {
            $("body #main-preloader").hide();
        });
    }

    // Управление сайдбаром
    static setActiveItemByPage = (page) => {
        $("#main-menu-sidebar .sidebar-item").each(function () {
            if ($(this).data("page") === page) {
                $(this).addClass("active");
            }
        });
    }

    static setAllSidebarItemsUnactive = () => {
        $("#main-menu-sidebar .sidebar-item").each(function () {
            $(this).removeClass("active");
        });
    }

    static changeItemByPage = (page) => {
        this.setAllSidebarItemsUnactive();
        this.setActiveItemByPage(page);
    }

    // Загрузить данные выбранного сервера
    static loadSelectedServer = () => {
        if (typeof window.localStorage.selectedServer !== "undefined") {
            selectedServer = window.localStorage.selectedServer;
            // Пробуем загрузить сервер в хидер
            KubekServerHeaderUI.loadServerByName(selectedServer, (result) => {
                if (result === false) {
                    // При ошибке загрузки выбираем первый сервер из списка, и пробуем ещё раз
                    KubekServers.getServersList((list) => {
                        window.localStorage.selectedServer = list[0];
                        window.location.reload();
                    });
                }
            });
        } else {
            // Если это первый запуск
            KubekServers.getServersList((list) => {
                window.localStorage.selectedServer = list[0];
                window.location.reload();
            });
        }
    }

    // Загрузить список серверов
    static loadServersList = () => {
        $("#servers-list-sidebar .server-item").remove();
        KubekServers.getServersList((servers) => {
            servers.forEach((serverItem) => {
                let isActive;
                serverItem === selectedServer ? isActive = " active" : isActive = "";
                $("#servers-list-sidebar").append('<div class="server-item sidebar-item' + isActive + '" onclick="window.localStorage.selectedServer = `' + serverItem + '`; window.location.reload()">\n' +
                    '      <div class="icon-circle-bg">\n' +
                    '        <img style="width: 24px; height: 24px;" alt="' + serverItem + '" src="/api/servers/' + serverItem + '/icon">\n' +
                    '      </div>\n' +
                    '      <span>' + serverItem + '</span>\n' +
                    '    </div>');
            })
        })
    };

    // Соединение с сервером потеряно
    static connectionLost = () => {
        KubekAlerts.addAlert("{{commons.connectionLost}}", "warning", moment().format("DD.MM / HH:MM:SS"), 6000);
        KubekUI.showPreloader();
    }

    // Соединение с сервером восстановление
    static connectionRestored = () => {
        KubekAlerts.addAlert("{{commons.connectionRestored}}", "check", moment().format("DD.MM / HH:MM:SS"), 3000);
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    // Открыть/закрыть sidebar, если он в mobile-режиме
    static toggleSidebar = () => {
        if(window.matchMedia("(max-width: 1360px)")){
            if ($(".main-layout .sidebar").hasClass("minimized")) {
                $(".main-layout .sidebar").removeClass("minimized");
                $(".blurScreen").show();
            } else {
                $(".main-layout .sidebar").addClass("minimized");
                $(".blurScreen").hide();
            }
        }
    };

    // Задать заголовок окна (вкладки)
    static setTitle(title){
        document.title = title;
    }
}

const animateCSSJ = (element, animation, fast = true, prefix = "animate__") =>
    // We create a Promise and return it
    new Promise((resolve) => {
        const animationName = `${prefix}${animation}`;

        if (fast === true) {
            $(element).addClass(`${prefix}animated ${animationName} ${prefix}faster`);
        } else {
            $(element).addClass(`${prefix}animated ${animationName}`);
        }

        // When the animation ends, we clean the classes and resolve the Promise
        function handleAnimationEnd(event) {
            event.stopPropagation();
            $(element).removeClass(
                `${prefix}animated ${animationName} ${prefix}faster`
            );
            resolve("Animation ended");
        }

        $(element)[0].addEventListener("animationend", handleAnimationEnd, {
            once: true,
        });
    });
