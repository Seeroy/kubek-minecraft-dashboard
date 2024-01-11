// Переменная для сохранения всех задач
global.tasks = {};

const LOGGER = require("./logger");
const MULTILANG = require("./multiLanguage");
const PREDEFINED = require("./predefined");

const colors = require("colors");
const crypto = require("crypto");

// Получить ID для новой задачи
exports.getNewTaskID = () => {
    return crypto.randomUUID().toString();
};

// Добавить новую задачу
exports.addNewTask = (data) => {
    let newTaskID = this.getNewTaskID();
    tasks[newTaskID] = data;
    LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.taskAdded}}", colors.cyan(newTaskID), colors.cyan(data.type)));
    return newTaskID;
};

// Удалить задачу по ID
exports.removeTask = (taskID) => {
    if (typeof tasks[taskID] !== 'undefined') {
        tasks[taskID] = null;
        delete tasks[taskID];
        LOGGER.log(MULTILANG.translateText(mainConfig.language, "{{console.taskRemoved}}", colors.cyan(taskID)));
        return true;
    }
    return false;
};

// Установить данные для задачи по ID
exports.setTaskData = (taskID, data) => {
    if (typeof tasks[taskID] !== 'undefined') {
        tasks[taskID] = data;
        return true;
    }
    return false;
}

// Проверить задачу на существование
exports.isTaskExists = (taskID) => {
    return typeof tasks[taskID] !== 'undefined';
};

// Получить данные задачи по ID
exports.getTaskData = (taskID) => {
    if (typeof tasks[taskID] !== 'undefined') {
        return tasks[taskID];
    }
    return false;
};

// Удалить все завершённые задачи
exports.removeCompletedTasks = () => {
    for (const [key, value] of Object.entries(tasks)) {
        if(typeof value.currentStep !== "undefined" && value.currentStep === PREDEFINED.SERVER_CREATION_STEPS.COMPLETED){
            tasks[key] = null;
            delete tasks[key];
        }
    }
    return true;
};