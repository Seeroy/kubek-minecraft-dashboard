let loadedScript;

class KubekPageManager {
    // Загрузить страницу
    static gotoPage = (page) => {
        this.loadPageContent(page);
    }

    // Загрузить страницу в блок (функция без проверок)
    static loadPageContent = (page) => {
        $("#content-place").html("");
        $("#content-place").append('<div id="content-preloader"><div class="lds-spinner"><div></div><div></div><div></div></div></div>');
        console.log("[UI]", "Trying to load page:", page);
        $.ajax({
            url: "/pages/" + page + ".html",
            success: function (result) {
                console.log("[UI]", "We got page content");
                KubekPageManager.setPageURL(page);
                KubekUI.setActiveItemByPage(page);

                setTimeout(() => {
                    // Динамически загружаем скрипт страницы
                    if(typeof loadedScript !== "undefined"){
                        document.head.removeChild(loadedScript);
                    }
                    loadedScript = document.createElement("script");
                    loadedScript.setAttribute("src", "/pages/" + page + ".js");
                    document.head.appendChild(loadedScript);

                    // Загружаем саму страницу
                    $("#content-place").append(result);
                    $("#content-preloader").remove();
                }, 100);
            },
            error: function (error) {
                console.error(
                    "[UI]",
                    "Error happend when loading page:",
                    error.status,
                    error.statusText
                );
                this.gotoPage("console");
            },
        });
    }

    // Обновить параметр в URL браузера
    static updateURLParameter = (url, param, paramVal) => {
        let newAdditionalURL = "";
        let tempArray = url.split("?");
        let baseURL = tempArray[0];
        let additionalURL = tempArray[1];
        let temp = "";
        if (additionalURL) {
            tempArray = additionalURL.split("&");
            for (let i = 0; i < tempArray.length; i++) {
                if (tempArray[i].split("=")[0] !== param) {
                    newAdditionalURL += temp + tempArray[i];
                    temp = "&";
                }
            }
        }

        let rows_txt = temp + "" + param + "=" + paramVal;
        return baseURL + "?" + newAdditionalURL + rows_txt;
    }

    // Установить URL браузера
    static setPageURL = (page) => {
        window.history.replaceState(
            "",
            "",
            this.updateURLParameter(window.location.href, "act", page)
        );
    }
}
