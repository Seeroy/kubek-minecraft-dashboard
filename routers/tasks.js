const COMMONS = require("./../modules/commons");
const TASK_MANAGER = require("./../modules/taskManager");

const express = require("express");
const router = express.Router();

// Endpoint списка задач
router.get("/", function (req, res) {
    res.set("Content-Type", "application/json");
    res.send(tasks);
    TASK_MANAGER.removeCompletedTasks();
});

// Endpoint задачи по её ID
router.get("/:id", function (req, res) {
    let q = req.params;
    if (COMMONS.isObjectsValid(q.id) && Object.keys(tasks).includes(q.id)) {
        res.set("Content-Type", "application/json");
        return res.send(tasks[q.id]);
    }
    res.sendStatus(400);
});

module.exports.router = router;