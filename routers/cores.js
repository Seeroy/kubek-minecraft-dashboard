var express = require("express");
var router = express.Router();
var additional = require("./../my_modules/additional");
var cores = require("./../my_modules/cores");
const auth_manager = require("./../my_modules/auth_manager");
var config = require("./../my_modules/config");

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
    if (authsucc == true) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get("/paper/search", function (req, res) {
  cores.getCoreURL(req.query.core, function (url) {
    res.send(url);
  });
});

router.get("/spigot/search", function (req, res) {
  cv = req.query.core.split(" ")[1];
  cores.getSpigotCores(function (cores) {
    res.send(cores[cv]);
  });
});

router.get("/spigot/list", function (req, res) {
  cores.getSpigotCores(function (cores) {
    res.send(cores);
  });
});

router.get("/list", function (req, res) {
  res.set("Content-Type", "application/json");
  possbileCores = ["Spigot", "Paper"];
  paperVers = [];
  spigotVers = [];
  cores.getPaperCores(function (cores_p) {
    cores_p = cores_p.reverse();
    cores_p.forEach(function (core) {
      paperVers.push(core.split(" ")[1]);
    });
    cores.getSpigotCores(function (cores_s) {
      Object.keys(cores_s).forEach(function (key, index) {
        spigotVers.push(key);
      }, cores_s);
      let jsn = {
        possible: possbileCores,
        paper: paperVers,
        spigot: spigotVers,
      };
      res.send(jsn);
    });
  });
});

module.exports = router;
