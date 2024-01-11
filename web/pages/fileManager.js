UPPER_DIR_ITEM = "<tr onclick='KubekFileManagerUI.upperDir()'><td></td><td>..</td><td></td><td></td></tr>";
DIR_ITEM_PLACEHOLDER = "<tr data-filename='$0' data-path='$1' data-type='$5'><td><div class='icon-bg'><span class='material-symbols-rounded'>$2</span></div></td><td>$0</td><td>$3</td><td>$4</td></tr>";
FILE_NAME_REGEXP = /^[\w,\s-]+\.[A-Za-z]{1,15}$/gi;

currentPath = "/";
tableListElement = $("#fm-table tbody");
currentEditorLang = "plaintext";
currentDataParts = [];
currentChunkID = null;
currentChunkWriting = null;
editableExtensions = [
    "txt",
    "log",
    "yml",
    "xml",
    "cfg",
    "conf",
    "config",
    "json",
    "yaml",
    "properties",
    "sh",
    "bat",
];

$(function () {
    KubekUI.setTitle("Kubek | {{sections.fileManager}}");

    KubekFileManagerUI.refreshDir();
})

KubekFileManagerUI = class {
    // Обновить содержимое папки
    static refreshDir = (saveScroll = true) => {
        KubekFileManager.readDirectory(currentPath, (data) => {
            // Сортируем данные, чтоб папки были сверху
            if (data.length > 0) {
                data = sortToDirsAndFiles(data);
            }
            let bindEvent, scrollData;
            // Для телефона делаем открытие по двойному тапу
            if (
                window.matchMedia("(min-width: 320px)").matches &&
                window.matchMedia("(max-width: 480px)").matches
            ) {
                bindEvent = "click";
            } else {
                bindEvent = "dblclick";
            }
            // Сохраняем скролл, если требуется
            if (saveScroll === true) {
                scrollData = $(".fm-container").scrollTop();
            } else {
                scrollData = 0;
            }
            tableListElement.html("");
            let currentPathSplit = currentPath.split("/");
            currentPathSplit = currentPathSplit.filter((element) => {
                return element !== "";
            });
            // Загружаем путь в breadcrumb
            $("#fm-breadcrumb").html("");
            $("#fm-breadcrumb").append("<span>/</span>");
            $("#fm-breadcrumb").append("<a>" + selectedServer + "</a>");
            if (currentPath !== "/") {
                currentPathSplit.forEach((item) => {
                    $("#fm-breadcrumb").append("<span>/</span>");
                    $("#fm-breadcrumb").append("<a>" + item + "</a>");
                });
            }
            // Биндим эвенты для breadcrumb
            KubekFileManagerUI.bindBreadcrumbClicks();
            if (currentPath !== "/") {
                tableListElement.append(UPPER_DIR_ITEM);
            }
            // Добавляем файлы в список
            data.forEach((file) => {
                let fileName = file.name;
                let filePath = file.path;
                let fileIcon;
                file.type === "file" ? fileIcon = "description" : fileIcon = "folder";
                let modifyDateVanilla = new Date(file.modify);
                let modifyDate = moment(modifyDateVanilla).format("DD.MM.YYYY HH:mm:ss");
                let fileSize = KubekUtils.humanizeFileSize(file.size);
                tableListElement.append(DIR_ITEM_PLACEHOLDER.replaceAll("$0", fileName).replaceAll("$1", filePath).replaceAll("$2", fileIcon).replaceAll("$3", modifyDate).replaceAll("$4", fileSize).replaceAll("$5", file.type))
            })

            // Биндим клики на файлы
            KubekFileManagerUI.bindFMFilesList(bindEvent);

            // Возвраащем значение скролла
            $("#fm-table").scrollTop(scrollData);
        });
    }

    // Бинд кликов на файлы
    static bindFMFilesList(bindEvent) {
        // Event для открытия контекстного меню
        $("#fm-table tbody tr").on("contextmenu", function (e) {
            let fileName = $(e.currentTarget).data("filename");
            let fileType = $(e.currentTarget).data("type");
            let dropdownData = [
                {
                    "icon": "delete",
                    "text": "{{commons.delete}}",
                    "data": "delete:" + currentPath + fileName
                },
                {
                    "icon": "bookmark_manager",
                    "text": "{{commons.rename}}",
                    "data": "rename:" + currentPath + fileName
                },
                {
                    "icon": "download",
                    "text": "{{commons.download}}",
                    "data": "download:" + currentPath + fileName
                }
            ]

            // Если директория - удалить лишнее
            if (fileType === "directory") {
                dropdownData.splice(2, 1);
            }

            KubekDropdowns.addDropdown(dropdownData, e.clientX, e.clientY, 5, (clickResult) => {
                if (typeof clickResult !== "undefined") {
                    let spl = clickResult.split(":");
                    let action = spl[0];
                    let path = spl.slice(1).join("");
                    switch (action) {
                        case "rename":
                            // Переименование файла/папки
                            KubekNotifyModal.askForInput("{{commons.rename}}", "bookmark_manager", (txt) => {
                                KubekFileManager.renameFile(path, txt, () => {
                                    KubekFileManagerUI.refreshDir();
                                })
                            }, "", "{{fileManager.enterName}}", KubekUtils.pathFilename(path), "text");
                            break;
                        case "delete":
                            // Удаление файла/папки
                            KubekNotifyModal.create("{{commons.delete}}", "{{fileManager.areYouWantToDelete}} " + KubekUtils.pathFilename(path), "{{commons.delete}}", "delete", () => {
                                KubekFileManager.delete(path, (result) => {
                                    if (result === false) {
                                        KubekAlerts.addAlert("{{commons.actionFailed}}", "warning", "{{commons.delete}} " + KubekUtils.pathFilename(path), 4000, "colored");
                                    }
                                    KubekFileManagerUI.refreshDir();
                                });
                            }, KubekPredefined.MODAL_CANCEL_BTN);
                            break;
                        case "download":
                            // Скачивание файла
                            KubekFileManager.downloadFile(path, () => {
                            });
                            break;
                    }
                }
            });
            e.preventDefault();
            return false;
        });
        // Event для клика
        $("#fm-table tbody tr").on(bindEvent, function () {
            let fileName = $(this).data("filename");
            let filePath = $(this).data("path");
            let fileType = $(this).data("type");
            // Открываем папку, если это папка :)
            if (fileType === "directory") {
                currentPath = currentPath + fileName + "/";
                KubekFileManagerUI.refreshDir();
            } else if (fileType === "file" && editableExtensions.includes(KubekUtils.pathExt(fileName))) {
                KubekFileManagerUI.editFile(currentPath + fileName);
            }
        });
    }

    // Бинд кликов на breadcrumb
    static bindBreadcrumbClicks() {
        $("#fm-breadcrumb a:not(:last-child)").on("click", function () {
            if ($(this).text() === selectedServer) {
                currentPath = "/";
                KubekFileManagerUI.refreshDir(false);
            } else {
                let path = "";
                let index = $(this).index();
                $("#fm-breadcrumb a:not(:last-child)").each(function (ind) {
                    if (
                        $(this).text() !== selectedServer &&
                        ind <= index
                    ) {
                        path = path + $(this).text() + "/";
                    }
                });
                currentPath = path;
                KubekFileManagerUI.refreshDir(false);
            }
        });
    }

    // Создание новой директории
    static newDirectory = () => {
        KubekNotifyModal.askForInput("{{fileManager.newDirectory}}", "create_new_folder", (txt) => {
            KubekFileManager.newDirectory(currentPath, txt, () => {
                KubekFileManagerUI.refreshDir();
            });
        }, "", "{{commons.input}}", "", "text");
    }

    // ..
    static upperDir = () => {
        currentPath = currentPath.split("/");
        currentPath.pop();
        currentPath.pop();
        currentPath = currentPath.join("/") + "/";
        KubekFileManagerUI.refreshDir(false);
    };

    // Загрузить файл на сервер
    static uploadFile = () => {
        let inputElement = $("#g-file-input");
        inputElement.trigger("click");
        inputElement.off("change");
        inputElement.on("change", () => {
            let formData = new FormData($("#g-file-form")[0]);
            KubekRequests.post("/fileManager/upload?server=" + selectedServer + "&path=" + currentPath, () => {
                KubekFileManagerUI.refreshDir();
            }, formData);
        });
    }

    // Открыть пустой редактор
    static openEmptyEditor = () => {
        KubekFileManagerUI.closeEditor();
        currentEditorLang = "plaintext";
        $(".blurScreen").show();
        $(".fileEditor").show();
    };

    // Открыть файл на редактирование
    static editFile = (path) => {
        let fileExt = KubekUtils.pathExt(path);
        let language = "plaintext";
        if (fileExt === "xml") {
            language = "xml";
        } else if (fileExt === "yml" || fileExt === "yaml") {
            language = "yaml";
        } else if (fileExt === "css") {
            language = "css";
        } else if (fileExt === "js") {
            language = "javascript";
        } else if (fileExt === "json") {
            language = "json";
        } else if (fileExt === "properties") {
            language = "ini";
        }
        currentEditorLang = language;
        KubekFileManager.readFile(path, (data) => {
            $("#code-edit").text(data);
            KubekFileManagerUI.formatCode(false);
            $(".blurScreen").show();
            $(".fileEditor input").val(KubekUtils.pathFilename(path));
            $(".fileEditor").show();
        });
    };

    // Сохранить файл
    static writeFile() {
        let inputVal = $(".fileEditor input").val();
        if (inputVal === "" || !FILE_NAME_REGEXP.test(inputVal)) {
            return false;
        }
        let path = currentPath + inputVal;
        let data = $("#code-edit").text();
        KubekFileManagerUI.closeEditor();
        currentDataParts = data.match(/[\s\S]{1,500}/g) || [];
        currentChunkWriting = -1;
        KubekFileManager.startChunkWrite(path, (result) => {
            currentChunkID = result;
            console.log("Starting write for", currentChunkID);
            KubekFileManagerUI.writeNextChunk();
        });
        return true;
    }

    // Записать следующий чанк
    static writeNextChunk() {
        currentChunkWriting++;
        if (typeof currentDataParts[currentChunkWriting] !== "undefined") {
            // Если чанки не закончились - записываем
            console.log("Writing chunk", currentChunkWriting, "to ID", currentChunkID);
            KubekFileManager.addChunkWrite(currentChunkID, Base64.encodeURI(currentDataParts[currentChunkWriting]), () => {
                KubekFileManagerUI.writeNextChunk();
            });
        } else {
            // Если закончились чанки - завершаем запись
            KubekFileManager.endChunkWrite(currentChunkID, () => {
                console.log("Write of", currentChunkID, "ended");
                currentChunkID = null;
                currentDataParts = null;
                currentChunkWriting = null;
                KubekAlerts.addAlert("{{fileManager.writeEnd}}", "check", "", 4000);
                KubekFileManagerUI.refreshDir();
            });
        }
    }

    // Форматировать текст в редакторе
    static formatCode(saveCaret = true) {
        let restore;
        saveCaret ? restore = saveCaretPosition($("#code-edit")[0]) : saveCaret = false;
        let result = hljs.highlight($("#code-edit").text(), {
            language: currentEditorLang
        });
        $("#code-edit").html(result.value);
        saveCaret ? restore() : saveCaret = false;
    }

    // Закрыть редактор
    static closeEditor() {
        $(".fileEditor").hide();
        $(".fileEditor input").val("");
        $("#code-edit").text("");
        $(".blurScreen").hide();
    }
}

// Форматировать код при вводе в редакторе
$("#code-edit").on("input", function () {
    KubekFileManagerUI.formatCode();
});

// Отсортировать по папкам и файлам
function sortToDirsAndFiles(data) {
    let dirs = [];
    let files = [];
    data.forEach(function (item) {
        if (item.type === "directory") {
            dirs.push(item);
        } else {
            files.push(item);
        }
    });
    let datanew = [];
    dirs.forEach(function (item) {
        datanew.push(item);
    });
    files.forEach(function (item) {
        datanew.push(item);
    });
    return datanew;
}

function saveCaretPosition(context) {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        range.setStart(context, 0);
        let len = range.toString().length;

        return function restore() {
            let pos = getTextNodeAtPosition(context, len);
            selection.removeAllRanges();
            let range = new Range();
            range.setStart(pos.node, pos.position);
            selection.addRange(range);

        }
    } else {
        return function restore() {
        }
    }
}

function getTextNodeAtPosition(root, index) {
    const NODE_TYPE = NodeFilter.SHOW_TEXT;
    let treeWalker = document.createTreeWalker(root, NODE_TYPE, function next(elem) {
        if (index > elem.textContent.length) {
            index -= elem.textContent.length;
            return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    let c = treeWalker.nextNode();
    return {
        node: c ? c : root,
        position: index
    };
}