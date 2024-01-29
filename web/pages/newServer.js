CORE_GRID_ITEM_PLACEHOLDER = "<div class='card centered' data-id='$1'> <img alt='$0 logo' class='icon' src='/assets/icons/cores/$1.png'> <span class='title'>$0</span> </div>";
JAVA_ITEM_PLACEHOLDER = "<div class='item' data-type='$0' data-data='$1'> <span class='text'>$2</span> <span class='check material-symbols-rounded'>check</span> </div>";
SERVER_NAME_REGEXP = /^[a-zA-Z0-9\-\_]{1,20}$/;
AIKAR_FLAGS = "--add-modules=jdk.incubator.vector -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20";

currentSelectedCore = "";
currentSelectedVersion = "";
allServersList = [];

$(function () {
    KubekUI.setTitle("Kubek | {{commons.create}} {{commons.server.lowerCase}}");

    // Заполняем список серверов для проверки на существование
    $("#servers-list-sidebar .sidebar-item span:last-child").each((i, el) => {
        allServersList.push($(el).text());
    });

    refreshServerCoresList(() => {
        refreshCoreVersionsList(() => {
            refreshJavaList(() => {});
        });
    });
    $(".new-server-container #server-port").val(25565);

    // Получаем кол-во ОЗУ, настраиваем поле ввода ОЗУ
    KubekRequests.get("/kubek/hardware/usage", (usage) => {
        let totalMemory = Math.ceil(Math.round(usage.ram.total / 1024 / 1024) / 512) * 512;
        let totalDigit = (totalMemory / 1024).toFixed(1) / 2;
        let maxMemory = (totalMemory / 1024).toFixed(1);
        $(".new-server-container #server-mem").val(totalDigit);
        $(".new-server-container #server-mem").attr("max", maxMemory);
        validateNewServerInputs();
    });
});

// Функция для валидации полей ввода
function validateNewServerInputs(){
    // Проверка на выбор файла ядра
    if($(".new-server-container #core-upload").css("display") !== "none" && $("#server-core-input")[0].value === ""){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noCoreFile}}");
        return;
    }

    // Проверка имени сервера
    let sName = $(".new-server-container #server-name-input").val();
    if(!SERVER_NAME_REGEXP.test(sName)){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noServerName}}");
        $(".new-server-container #server-name-input").addClass("error");
        return;
    } else {
        $(".new-server-container #server-name-input").removeClass("error");
    }

    // Проверка имени сервера на существование
    if(allServersList.includes(sName)){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.serverAlreadyExists}}");
        $(".new-server-container #server-name-input").addClass("error");
        return;
    } else {
        $(".new-server-container #server-name-input").removeClass("error");
    }

    // Проверка ввода памяти
    let memInput = $(".new-server-container #server-mem");
    if(memInput.val() < memInput.attr("min") && memInput.val() > memInput.attr("max") && memInput !== ""){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noMemory}}");
        $(".new-server-container #server-mem").addClass("error");
        return;
    } else {
        $(".new-server-container #server-mem").removeClass("error");
    }

    // Проверка ввода порта
    let portInput = $(".new-server-container #server-port");
    if(portInput.val() < portInput.attr("min") && portInput.val() > portInput.attr("max") && portInput !== ""){
        $(".new-server-container #create-server-btn").prop("disabled", true);
        $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noPort}}");
        $(".new-server-container #server-port").addClass("error");
        return;
    } else {
        $(".new-server-container #server-port").removeClass("error");
    }

    // Проверка выбора версии и ядра
    if($(".new-server-container #core-upload").css("display") === "none"){
        if($(".new-server-container #cores-grid .item.active").length === 1 && $(".new-server-container #cores-versions .item.active").length === 1){
            $(".new-server-container #create-server-btn").prop("disabled", true);
            $(".new-server-container #create-server-btn .text").text("{{newServerWizard.noCoreSelected}}");
            return;
        }
    }

    // Если все проверки прошли
    $(".new-server-container #create-server-btn").prop("disabled", false);
    $(".new-server-container #create-server-btn .text").text("Создать " + sName);
}

// Функция для обновления списка ядер
function refreshServerCoresList(cb = () => {
}) {
    currentSelectedCore = "";
    currentSelectedVersion = "";
    KubekCoresManager.getList((cores) => {
        $(".new-server-container #cores-grid .card").off("click");

        // Очищаем список
        $(".new-server-container #cores-grid").html("");

        // Загружаем новый список
        for (const [, core] of Object.entries(cores)) {
            $(".new-server-container #cores-grid").append(CORE_GRID_ITEM_PLACEHOLDER.replaceAll("$0", core.displayName).replaceAll("$1", core.name));
        }
        // Делаем первый элемент активным и загружаем ID ядра в переменную
        $(".new-server-container #cores-grid .card:first-child").addClass("active");
        currentSelectedCore = $(".new-server-container #cores-grid .card:first-child").data("id");

        // Биндим нажатия на карточки
        $(".new-server-container #cores-grid .card").on("click", function () {
            if (!$(this).hasClass("active")) {
                $(".new-server-container #cores-grid .card.active").removeClass("active");
                $(this).addClass("active");
                currentSelectedCore = $(this).data("id");
                KubekUI.showPreloader();
                refreshCoreVersionsList(() => {
                    validateNewServerInputs();
                    KubekUI.hidePreloader();
                });
            }
        })
        cb(true);
    });
}

// Бинд на имя сервера
$(".new-server-container input").on("input", function(){
   validateNewServerInputs();
});

// Функция для обновления списка версий ядра
function refreshCoreVersionsList(cb = () => {
}) {
    currentSelectedVersion = "";
    KubekCoresManager.getCoreVersions(currentSelectedCore, (versions) => {
        $(".new-server-container #cores-versions .item").off("click");

        // Очищаем список
        $(".new-server-container #cores-versions").html("");

        // Загружаем новый список
        versions.forEach((ver) => {
            $(".new-server-container #cores-versions").append("<div class='item'>" + ver + "</div>");
        });
        // Делаем первый элемент активным и загружаем версию в переменную
        $(".new-server-container #cores-versions .item:first-child").addClass("active");
        currentSelectedVersion = $(".new-server-container #cores-versions .item:first-child").text();

        // Биндим нажатия на версии
        $(".new-server-container #cores-versions .item").on("click", function () {
            if (!$(this).hasClass("active")) {
                $(".new-server-container #cores-versions .item.active").removeClass("active");
                $(this).addClass("active");
                currentSelectedVersion = $(this).text();
                validateNewServerInputs();
            }
        })
        cb(true);
    });
}

// Вызвать диалог для выбора файла ядра
function uploadCore() {
    $("#server-core-input").trigger("click");
    $("#server-core-input").off("change");
    $("#server-core-input").on("change", () => {
        $(".new-server-container #core-upload #uploaded-file-name").text($("#server-core-input")[0].files[0].name);
        validateNewServerInputs();
    });
}

// Обновить список Java
function refreshJavaList(cb) {
    $("#java-list-placeholder").show();
    $("#javas-list").hide();
    KubekJavaManager.getAllJavas((javas) => {
        $(".new-server-container #javas-list").html("");
        javas.installed.forEach((installed) => {
            $(".new-server-container #javas-list").append(JAVA_ITEM_PLACEHOLDER.replaceAll("$0", "installed").replaceAll("$1", installed).replaceAll("$2", installed));
        });
        javas.kubek.forEach((installed) => {
            $(".new-server-container #javas-list").append(JAVA_ITEM_PLACEHOLDER.replaceAll("$0", "kubek").replaceAll("$1", installed).replaceAll("$2", "Temurin Java " + installed + " ({{commons.installed}})"));
        });
        javas.online.forEach((online) => {
            $(".new-server-container #javas-list").append(JAVA_ITEM_PLACEHOLDER.replaceAll("$0", "online").replaceAll("$1", online).replaceAll("$2", "Temurin Java " + online));
        });
        $(".new-server-container #javas-list .item:first-child").addClass("active");

        // Биндим нажатия на версии
        $(".new-server-container #javas-list .item").on("click", function () {
            if (!$(this).hasClass("active")) {
                $(".new-server-container #javas-list .item.active").removeClass("active");
                $(this).addClass("active");
                validateNewServerInputs();
            }
        })
        $("#java-list-placeholder").hide();
        $("#javas-list").show();
        cb(true);
    });
}

// Собрать start script запуска сервера
function generateNewServerStart(){
    let result = "-Xmx" + $("#server-mem").val() * 1024 + "M";
    if($("#add-aikar-flags").is(":checked")){
        result = result + " " + encodeURIComponent(AIKAR_FLAGS);
    }
    return result;
}

// Биндим нажатия на категории ядра
$(".new-server-container #core-category .item").on("click", function () {
    if (!$(this).hasClass("active")) {
        $(".new-server-container #core-category .item.active").removeClass("active");
        $(this).addClass("active");
        if ($(this).data("item") === "list") {
            $(".new-server-container #cores-grid").show();
            $(".new-server-container #cores-versions-parent").show();
            $(".new-server-container #core-upload").hide();
        } else {
            $(".new-server-container #cores-grid").hide();
            $(".new-server-container #cores-versions-parent").hide();
            $(".new-server-container #core-upload").show();
        }
        validateNewServerInputs();
    }
});

// Начать создание сервера
function prepareServerCreation(){
    $(".new-server-container #create-server-btn .text").text("{{newServerWizard.creationStartedShort}}");
    $(".new-server-container #create-server-btn").attr("disabled", "true");
    $(".new-server-container #create-server-btn .material-symbols-rounded:not(.spinning)").hide();
    $(".new-server-container #create-server-btn .material-symbols-rounded.spinning").show();

    let serverName = $(".new-server-container #server-name-input").val();
    let serverPort = $(".new-server-container #server-port").val();
    let serverCore = "";
    let serverVersion = "";
    let javaVersion = "";
    let startScript = "";

    javaVersion = $(".new-server-container #javas-list .item.active").data("data");
    startScript = generateNewServerStart();

    if($(".new-server-container #core-upload").css("display") === "none"){
        serverCore = currentSelectedCore;
        serverVersion = currentSelectedVersion;
        startServerCreation(serverName, serverCore, serverVersion, startScript, javaVersion, serverPort);
    } else {
        serverCore = $("#server-core-input")[0].files[0].name;
        serverVersion = serverCore;
        let formData = new FormData($("#server-core-form")[0]);
        KubekRequests.post("/cores/" + serverName, () => {
            startServerCreation(serverName, serverCore, serverVersion, startScript, javaVersion, serverPort);
        }, formData);
    }
}

function startServerCreation(serverName, serverCore, serverVersion, startScript, javaVersion, serverPort){
    KubekRequests.get("/servers/new?server=" + serverName + "&core=" + serverCore + "&coreVersion=" + serverVersion + "&startParameters=" + startScript + "&javaVersion=" + javaVersion + "&port=" + serverPort, () => {
        $(".new-server-container #after-creation-text").text("{{newServerWizard.creationCompleted}}");
    });
}