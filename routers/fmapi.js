var express = require("express");
var router = express.Router();
var additional = require("./../my_modules/additional");
var fmapi = require("./../my_modules/fmapi");
var config = require("./../my_modules/config");
var fs = require("fs");
var path = require("path");
const auth_manager = require("./../my_modules/auth_manager");

const ACCESS_PERMISSION = "filemanager";

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

router.get("/scanDirectory", function (req, res) {
  if (
    additional.validatePath(req.query.directory) == true &&
    additional.validatePath(req.query.server) == true
  ) {
    fmapi.scanDirectory(req.query.server, req.query.directory, function (data) {
      res.send(data);
    });
  } else {
    res.status(403).send();
  }
});

router.get("/getFile", function (req, res) {
  if (
    additional.validatePath(req.query.path) == true &&
    additional.validatePath(req.query.server) == true
  ) {
    res.send(fmapi.readFile(req.query.server, req.query.path));
  } else {
    res.status(403).send();
  }
});

router.get("/packetRemoving", function (req, res) {
  server = req.query.server;
  parse = JSON.parse(req.query.items);
  list = parse.list;
  fspath = parse.path;
  statuses = {};
  statuses["directory"] = 0;
  statuses["file"] = 0;
  if (fs.existsSync("./servers/" + server + "/" + fspath)) {
    list.forEach((element) => {
      if (element.type == "directory") {
        if (
          fmapi.deleteDirFM(req.query.server, fspath + "/" + element.name) ==
          true
        ) {
          statuses["directory"]++;
        }
      } else {
        if (
          fmapi.deleteFM(req.query.server, fspath + "/" + element.name) == true
        ) {
          statuses["file"]++;
        }
      }
    });
    res.send(statuses);
  } else {
    res.send(false);
  }
});

router.get("/saveFile", function (req, res) {
  if (
    additional.validatePath(req.query.path) == true &&
    additional.validatePath(req.query.server) == true
  ) {
    res.send(fmapi.saveFile(req.query.server, req.query.path, req.query.text));
  } else {
    res.status(403).send();
  }
});

router.get("/downloadFile", function (req, res) {
  if (
    additional.validatePath(req.query.path) == true &&
    additional.validatePath(req.query.server) == true
  ) {
    path_download = path.resolve(
      "./servers/" + req.query.server + req.query.path
    );
    res.download(path_download);
  } else {
    res.status(403).send();
  }
});

router.get("/deleteFile", function (req, res) {
  if (
    additional.validatePath(req.query.path) == true &&
    additional.validatePath(req.query.server) == true
  ) {
    res.send(fmapi.deleteFM(req.query.server, req.query.path));
  } else {
    res.status(403).send();
  }
});

router.get("/deleteDirectory", function (req, res) {
  if (
    additional.validatePath(req.query.path) == true &&
    additional.validatePath(req.query.server) == true
  ) {
    res.send(fmapi.deleteDirFM(req.query.server, req.query.path));
  } else {
    res.status(403).send();
  }
});

router.get("/renameFile", function (req, res) {
  if (
    additional.validatePath(req.query.path) == true &&
    additional.validatePath(req.query.server) == true &&
    additional.validatePath(req.query.newname) == true
  ) {
    res.send(
      fmapi.renameFM(req.query.server, req.query.path, req.query.newname)
    );
  } else {
    res.status(403).send();
  }
});

router.get("/newDirectory", function (req, res) {
  if (
    additional.validatePath(req.query.path) == true &&
    additional.validatePath(req.query.server) == true &&
    additional.validatePath(req.query.newdir) == true
  ) {
    res.send(
      fmapi.newdirFM(req.query.server, req.query.path, req.query.newdir)
    );
  } else {
    res.status(403).send();
  }
});

module.exports = router;
