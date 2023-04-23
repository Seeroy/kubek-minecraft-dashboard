var express = require("express");
var router = express.Router();
var fs = require("fs");
var additional = require("./../my_modules/additional");
var config = require("./../my_modules/config");
var plugins = require("./../my_modules/plugins");
const auth_manager = require("./../my_modules/auth_manager");

const ACCESS_PERMISSION = "plugins";

router.use(function (req, res, next) {
  additional.showRequestInLogs(req, res);
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
    if (perms.includes(ACCESS_PERMISSION)) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get("/installed", function (req, res) {
  res.set("content-type", "application/json");
  if (fs.existsSync("./servers/" + req.query.server + "/plugins")) {
    res.send(plugins.getInstalledPlugins(req.query.server));
  } else {
    res.send(JSON.stringify([]));
  }
});

router.get("/installedMods", function (req, res) {
  res.set("content-type", "application/json");
  if (fs.existsSync("./servers/" + req.query.server + "/mods")) {
    res.send(plugins.getInstalledMods(req.query.server));
  } else {
    res.send(JSON.stringify([]));
  }
});

router.get("/deleteMod", function (req, res) {
  plugins.deleteInstalledMod(req.query.server, req.query.file);
  res.send("Success");
});

router.get("/changeStatus", function (req, res) {
  plugins.changeStatus(
    req.query.server,
    req.query.type,
    req.query.file,
    req.query.status
  );
  res.send("Success");
});

router.get("/delete", function (req, res) {
  plugins.deleteInstalledPlugin(req.query.server, req.query.file);
  res.send("Success");
});

module.exports = router;
