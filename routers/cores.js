// Cores versions methods: 0 - papermc api, 1 - external url, 2 - purpurmc api, 3 - magma api
// Cores url get method: 0 - papermc api, 1 - external url, 2 - purpurmc api, 3 - magma api
var express = require("express");
var router = express.Router();
var additional = require("./../my_modules/additional");
var cores = require("./../my_modules/cores");
const auth_manager = require("./../my_modules/auth_manager");
var config = require("./../my_modules/config");

const CORES_CONFIG = {
  vanilla: {
    name: "vanilla",
    displayName: "Mojang Vanilla Server",
    versionsMethod: 1,
    versionsUrl: "https://seeroy.github.io/vanilla.json",
    urlGetMethod: 1
  },
  paper: {
    name: "paper",
    displayName: "PaperMC",
    versionsMethod: 0,
    urlGetMethod: 0
  },
  waterfall: {
    name: "waterfall",
    displayName: "Waterfall (Proxy)",
    versionsMethod: 0,
    urlGetMethod: 0
  },
  velocity: {
    name: "velocity",
    displayName: "Velocity (Proxy)",
    versionsMethod: 0,
    urlGetMethod: 0
  },
  purpur: {
    name: "purpur",
    displayName: "Purpur (PaperMC Fork)",
    versionsMethod: 2,
    urlGetMethod: 2
  },
  magma: {
    name: "magma",
    displayName: "Magma (Plugins + Mods)",
    versionsMethod: 3,
    urlGetMethod: 3
  },
  spigot: {
    name: "spigot",
    displayName: "Spigot",
    versionsMethod: 1,
    versionsUrl: "https://seeroy.github.io/spigots.json",
    urlGetMethod: 1
  },
};

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

router.get("/list", function (req, res) {
  res.json(CORES_CONFIG);
});

router.get("/versions", function (req, res) {
  if (
    typeof req.query.core !== "undefined" &&
    typeof CORES_CONFIG[req.query.core] !== "undefined"
  ) {
    if (CORES_CONFIG[req.query.core].versionsMethod == 0) {
      cores.paperVersionsMethod(
        CORES_CONFIG[req.query.core].name,
        function (versions) {
          res.json(versions);
        }
      );
    } else if (CORES_CONFIG[req.query.core].versionsMethod == 1) {
      cores.externalURLVersionsMethod(
        CORES_CONFIG[req.query.core].versionsUrl,
        function (versions) {
          res.json(versions);
        }
      );
    } else if (CORES_CONFIG[req.query.core].versionsMethod == 2) {
      cores.purpurVersionsMethod(
        function (versions) {
          res.json(versions);
        }
      );
    } else if (CORES_CONFIG[req.query.core].versionsMethod == 3) {
      cores.magmaVersionsMethod(
        function (versions) {
          res.json(versions);
        }
      );
    }
  } else {
    res.send(false);
  }
});

router.get("/url", function (req, res) {
  if (
    typeof req.query.core !== "undefined" &&
    typeof CORES_CONFIG[req.query.core] !== "undefined" &&
    typeof req.query.version !== "undefined"
  ) {
    if (CORES_CONFIG[req.query.core].urlGetMethod == 0) {
      cores.getCoreURL_paperMethod(
        CORES_CONFIG[req.query.core].name,
        req.query.version,
        function (url) {
          res.send(url);
        }
      );
    } else if (CORES_CONFIG[req.query.core].urlGetMethod == 1) {
      cores.getCoreURL_externalMethod(
        CORES_CONFIG[req.query.core].versionsUrl,
        req.query.version,
        function (url) {
          res.send(url);
        }
      );
    } else if (CORES_CONFIG[req.query.core].urlGetMethod == 2) {
      cores.getCoreURL_purpurMethod(
        req.query.version,
        function (url) {
          res.send(url);
        }
      );
    } else if (CORES_CONFIG[req.query.core].urlGetMethod == 3) {
      cores.getCoreURL_magmaMethod(
        req.query.version,
        function (url) {
          res.send(url);
        }
      );
    }
  } else {
    res.send(false);
  }
});

module.exports = router;