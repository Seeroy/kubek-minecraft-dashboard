class KubekRequests {
    // Сделать AJAX-запрос с нужными настройками
    static makeAjaxRequest = (url, type, data = "", apiEndpoint = true, cb = () => {
    }) => {
        if (apiEndpoint) {
            url = KubekPredefined.API_ENDPOINT + url;
        }
        if(data !== ""){
            $.ajax({
                url: url,
                type: type.toString().toUpperCase(),
                data: data,
                success: function (response) {
                    cb(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if(errorThrown === "Forbidden"){
                        KubekAlerts.addAlert("{{commons.failedToRequest}}", "warning", "{{commons.maybeUDoesntHaveAccess}}", 5000);
                    }
                    cb(false, textStatus, errorThrown);
                },
                processData: false,
                contentType: false
            });
        } else {
            $.ajax({
                url: url,
                type: type.toString().toUpperCase(),
                success: function (response) {
                    cb(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if(errorThrown === "Forbidden"){
                        KubekAlerts.addAlert("{{commons.failedToRequest}}", "warning", "{{commons.maybeUDoesntHaveAccess}}", 5000);
                    }
                    cb(false, textStatus, errorThrown);
                }
            });
        }
    }

    // Функция для каждого типа запроса
    static get = (url, cb, apiEndpoint = true) => {
        this.makeAjaxRequest(url, "GET", "", apiEndpoint, cb);
    }

    static post = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "POST", data, apiEndpoint, cb);
    }

    static put = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "PUT", data, apiEndpoint, cb);
    }

    static delete = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "DELETE", data, apiEndpoint, cb);
    }

    static head = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "HEAD", data, apiEndpoint, cb);
    }

    static options = (url, cb, data = "", apiEndpoint = true) => {
        this.makeAjaxRequest(url, "OPTIONS", data, apiEndpoint, cb);
    }
}