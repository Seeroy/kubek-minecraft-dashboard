var express = require("express");
var router = express.Router();
const auth_manager = require("./../my_modules/auth_manager");
var config = require("./../my_modules/config");

router.use(function (req, res, next) {
  cfg = config.readConfig();
  ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg["internet-access"] == false && ip != "127.0.0.1") {
    res.send("Cannot be accessed from the internet");
  } else {
    authsucc = auth_manager.authorize(
      req.cookies["kbk__hash"],
      req.cookies["kbk__login"]
    );
    if (authsucc == true) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get("/progress", function (req, res) {
  res.set("Content-Type", "application/json");
  res.send(JSON.stringify(pendingTasks));
});

module.exports = router;
