var express = require("express");
var router = express.Router();
var additional = require("./../my_modules/additional");
const auth_manager = require("./../my_modules/auth_manager");
var config = require("./../my_modules/config");
var backups = require("./../my_modules/backups");
var fs = require("fs");
const nodeDiskInfo = require("node-disk-info");

const ACCESS_PERMISSION = "backups";

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
    if (authsucc == true && perms.includes(ACCESS_PERMISSION)) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get("/list", function (req, res) {
  res.type("json");
  res.send(backups.getBackupsList());
});

router.get("/restore", function (req, res) {
  if (req.query.filename.match(/\.\.\//gm) == null) {
    if (fs.existsSync("./backups/" + req.query.filename)) {
      backups.restoreBackup(
        req.query.filename,
        req.query.server,
        function (ress) {
          res.send(ress);
        }
      );
    } else {
      res.send(false);
    }
  } else {
    res.send(false);
  }
});

router.get("/delete", function (req, res) {
  if (req.query.filename.match(/\.\.\//gm) == null) {
    if (fs.existsSync("./backups/" + req.query.filename)) {
      fs.unlinkSync("./backups/" + req.query.filename);
      fs.unlinkSync("./backups/" + req.query.filename.replace(".zip", ".json"));
      res.send(true);
    } else {
      res.send(false);
    }
  } else {
    res.send(false);
  }
});

router.get("/diskStats", function (req, res) {
  cur_disk = process.cwd().replaceAll(/\\/gm, "/").split("/")[0];
  nodeDiskInfo
    .getDiskInfo()
    .then((disks) => {
      ds = false;
      disks.forEach(function (disk) {
        if (disk["_mounted"] == cur_disk) {
          ds = disk;
        }
      });
      res.send(ds);
    })
    .catch((reason) => {
      console.error(reason);
      res.send("error");
    });
});

router.get("/download", function (req, res) {
  if (req.query.filename.match(/\.\.\//gm) == null) {
    if (fs.existsSync("./backups/" + req.query.filename)) {
      res.download("./backups/" + req.query.filename);
    } else {
      res.send(false);
    }
  } else {
    res.send(false);
  }
});

router.get("/new", function (req, res) {
  bname = req.query.name;
  desc = req.query.desc;
  type = req.query.type;
  ratio = req.query.ratio;
  sn = req.query.sn;
  if (
    (typeof bname !== "undefined" &&
      typeof desc !== "undefined" &&
      type == "full") ||
    (type == "selected" && typeof ratio !== "undefined")
  ) {
    if (type == "full") {
      ret = backups.createNewBackup(bname, desc, type, sn, ratio);
    } else {
      files = JSON.parse(req.query.files);
      ret = backups.createNewBackup(bname, desc, type, sn, ratio, files);
    }
  } else {
    ret = false;
  }
  res.type("json");
  res.send(ret);
});

module.exports = router;
