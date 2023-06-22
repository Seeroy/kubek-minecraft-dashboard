var express = require("express");
var router = express.Router();
var path = require("path");
var fs = require("fs");
var config = require("./../my_modules/config");
const auth_manager = require("./../my_modules/auth_manager");
const { spawn } = require("node:child_process");
var iconvlite = require("iconv-lite");
var colors = require("colors");
const translator = require("./../my_modules/translator");
const additional = require("./../my_modules/additional");
const modulesys = require("./../my_modules/modulesys");

const ACCESS_PERMISSION = "ext_manager";

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
    perms = auth_manager.getUserPermissions(req);
    if (authsucc == true && perms.includes(ACCESS_PERMISSION)) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get("/list", function (req, res) {
  res.json(modulesys.listModules());
});

module.exports = router;