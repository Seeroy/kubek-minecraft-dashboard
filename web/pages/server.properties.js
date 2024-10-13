SWITCH_ELEMENT = '<label class="switch"> <input type="checkbox"$0> <span class="slider round"></span></label>';
NUMBER_INPUT = "<input type='number' value='$0'>";
TEXT_INPUT = "<input type='text' value='$0'>";

$(function () {
    KubekUI.setTitle("Kubek | Server.properties");

    KubekServerPropertiesUI.loadProperties();
})

KubekServerPropertiesUI = class {
    static loadProperties() {
        KubekRequests.get("/servers/" + selectedServer + "/server.properties", (result) => {
            for (const [key, value] of Object.entries(result)) {
                let keyStr = key;
                let valueStr = value;
                valueStr === null ? valueStr = "" : valueStr;

                let valType = this.getValueType(valueStr);
                if(keyStr === "server-ip") valType = "string";

                let htmlCode = "";
                htmlCode += "<tr><td>" + keyStr + "</td><td>";
                switch (valType) {
                    case "boolean":
                        let isChecked = "";
                        if (valueStr === true) {
                            isChecked = " checked";
                        }
                        htmlCode += SWITCH_ELEMENT.replace("$0", isChecked);
                        break;
                    case "number":
                        htmlCode += NUMBER_INPUT.replace("$0", valueStr);
                        break;
                    default:
                        htmlCode += TEXT_INPUT.replace("$0", valueStr);
                        break;
                }
                htmlCode += "</td></tr>";
                $("#sp-table").append(htmlCode);
            }
        });
    }

    static saveProperties() {
        let saveResult = {};
        $("#sp-table tr").each((i, element) => {
            let key = $(element).find("td:first-child").text();
            let innerItem = $(element).find("td:last-child")[0];
            let value = null;
            // Ищем чекбоксы/поля ввода
            if ($(innerItem).find("input[type='checkbox']").length === 1) {
                value = $(innerItem).find("input[type='checkbox']").is(":checked");
            } else {
                value = $(innerItem).find("input").val();
            }
            saveResult[key] = value;
        });
        KubekRequests.put("/servers/" + selectedServer + "/server.properties?server=" + selectedServer + "&data=" + Base64.encodeURI(JSON.stringify(saveResult)), (result) => {
            if (result !== false) {
                KubekAlerts.addAlert("{{fileManager.writeEnd}}", "check", "", 5000);
            }
        });
    }

    static getValueType(value) {
        if (value === true || value === false) {
            return "boolean";
        }
        if (!isNaN(parseInt(value))) {
            return "number";
        }
        return "string";
    }
}