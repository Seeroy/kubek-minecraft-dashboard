const TASK_ITEM_PLACEHOLDER = "<div class='alert' data-id='$0'><div class='$1'>$2</div><div class='content-2'><span class='caption'>$3</span><span class='description'>$4</span></div></div>";

let isConnectionLost = false;

class KubekTasksUI {
    // Добавить новую задачу в список
    static addTask(id, icon, title, description, append = true, iconType = "symbol", iconBgClasses = "icon-bg colored") {
        let iconPrepared = "";
        if (iconType === "symbol") {
            iconPrepared = "<span class='material-symbols-rounded'>" + icon + "</span>";
        } else if (iconType === "image") {
            iconPrepared = "<img src='" + icon + "' style='width: 24px; height: 24px;'/>";
        }
        let taskHTML = TASK_ITEM_PLACEHOLDER.replaceAll("$0", id).replaceAll("$1", iconBgClasses).replaceAll("$2", iconPrepared).replaceAll("$3", title).replaceAll("$4", description);
        if (append === true) {
            $("#tasks-pool").append(taskHTML);
        } else {
            $("#tasks-pool").prepend(taskHTML);
        }
    }

    // Удалить задачу из списка по ID
    static removeTaskByID(id) {
        $("#tasks-pool .alert").each((element) => {
            if (element.data("id") === id) {
                $(element).remove();
                return true;
            }
        });
        return false;
    }

    // Очистить список задач
    static removeAllTasks() {
        $("#tasks-pool").html("");
    }

    // Обновить список задач
    static refreshTasksList() {
        $.ajax({
            url: KubekPredefined.API_ENDPOINT + "/tasks",
            error: function (e) {
                if (isConnectionLost === false && e.status === 0) {
                    KubekUI.connectionLost();
                }
                isConnectionLost = true;
            },
            success: (tasks) => {
                if (isConnectionLost === true) {
                    KubekUI.connectionRestored();
                }
                isConnectionLost = false;
                this.removeAllTasks();
                for (const [id, task] of Object.entries(tasks)) {
                    let icon = "";
                    let title = "";
                    let description = "";
                    let iconBg = "icon-bg colored";
                    // Если идёт процесс создания сервера
                    if (task.type === KubekPredefined.TASKS_TYPES.CREATING && typeof task.serverName !== "undefined") {
                        icon = "deployed_code_history";
                        iconBg = "icon-bg";
                        title = "{{tasksTypes.creating}} " + task.serverName;
                        // Куча говнокода, уж простите меня
                        switch (task.currentStep) {
                            case KubekPredefined.SERVER_CREATION_STEPS.CHECKING_JAVA:
                                description = "{{serverCreationSteps.checkingJava}}";
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.CREATING_BAT:
                                description = "{{serverCreationSteps.creatingBat}}";
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.COMPLETED:
                                description = "{{serverCreationSteps.completed}}";
                                icon = "check_circle";
                                iconBg = "bg-success icon-bg";
                                KubekNotifyModal.create(task.serverName, "{{newServerWizard.creationCompleted}}", "{{commons.goto}}", "check", () => {
                                    window.localStorage.selectedServer = task.serverName;
                                    window.location = "/?act=console";
                                }, KubekPredefined.MODAL_CANCEL_BTN);
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.COMPLETION:
                                description = "{{serverCreationSteps.completion}}";
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.FAILED:
                                icon = "deployed_code_alert";
                                description = "{{serverCreationSteps.failed}}";
                                iconBg = "bg-error icon-bg";
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.DOWNLOADING_CORE:
                                description = "{{serverCreationSteps.downloadingCore}}";
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.DOWNLOADING_JAVA:
                                description = "{{serverCreationSteps.downloadingJava}}";
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.SEARCHING_CORE:
                                description = "{{serverCreationSteps.searchingCore}}";
                                break;
                            case KubekPredefined.SERVER_CREATION_STEPS.UNPACKING_JAVA:
                                description = "{{serverCreationSteps.unpackingJava}}";
                                break;
                        }
                    } else if (task.type === KubekPredefined.TASKS_TYPES.DOWNLOADING) {
                        icon = "deployed_code_update";
                        title = "{{tasksTypes.downloading}} " + task.filename;
                        description = "<div style='display: flex; margin: 4px 0; align-items: center'><div style='margin: 2px 1px; height: 4px; width: 100%; background: var(--bg-dark-accent-light)'><div style='width: " + task.progress + "%; height: 100%; background: var(--bg-primary-500)'></div></div><span style='margin-left: 4px; font-size: 12pt;'>" + task.progress + "%</span></div>";
                        iconBg = "bg-warning icon-bg";
                    } else if (task.type === KubekPredefined.TASKS_TYPES.INSTALLING) {
                        icon = "install_desktop";
                        title = "{{tasksTypes.installing}}";
                        description = task.description;
                    } else if (task.type === KubekPredefined.TASKS_TYPES.UPDATING) {
                        icon = "update";
                        title = "{{tasksTypes.updating}}";
                        description = task.description;
                    } else if (task.type === KubekPredefined.TASKS_TYPES.RESTARTING) {
                        icon = "restart_alt";
                        title = "{{tasksTypes.restarting}}";
                        description = task.description;
                    } else if (task.type === KubekPredefined.TASKS_TYPES.UNPACKING) {
                        icon = "archive";
                        title = "{{tasksTypes.unpacking}}";
                        description = task.description;
                    } else if (task.type === KubekPredefined.TASKS_TYPES.ZIPPING) {
                        icon = "archive";
                        title = "{{tasksTypes.zipping}}";
                        description = task.description;
                    } else if (task.type === KubekPredefined.TASKS_TYPES.DELETION) {
                        icon = "delete";
                        title = "{{tasksTypes.deletion}}";
                        description = task.server;
                        if(task.status === KubekPredefined.SERVER_CREATION_STEPS.COMPLETED){
                            window.location = "/?act=console";
                        }
                    }
                    this.addTask(id, icon, title, description, true, "symbol", iconBg);
                }
            },
            timeout: 3000 // sets timeout to 3 seconds
        });
    }
}