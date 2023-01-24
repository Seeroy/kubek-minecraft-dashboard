var express = require('express');
var router = express.Router();
var additional = require("./../my_modules/additional");
var fmapi = require("./../my_modules/fmapi");
var config = require("./../my_modules/config");
var path = require("path");
const auth_manager = require("./../my_modules/auth_manager");

const ACCESS_PERMISSION = "filemanager";

router.use(function (req, res, next) {
  additional.showRequestInLogs(req, res);
  cfg = config.readConfig();
  ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    res.send("Cannot be accessed from the internet");
  } else {
    authsucc = auth_manager.authorize(req.cookies["kbk__hash"], req.cookies["kbk__login"]);
    perms = auth_manager.getUserPermissions(req);
    if (authsucc == true && perms.includes(ACCESS_PERMISSION)) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get('/scanDirectory', function (req, res) {
  fmapi.scanDirectory(req.query.server, req.query.directory, function (data) {
    res.send(data);
  });
});

router.get('/getFile', function (req, res) {
  res.send(fmapi.readFile(req.query.server, req.query.path));
});

router.get('/saveFile', function (req, res) {
  res.send(fmapi.saveFile(req.query.server, req.query.path, req.query.text));
});

router.get('/downloadFile', function (req, res) {
  path_download = path.resolve("./servers/" + req.query.server + req.query.path);
  res.download(path_download);
});

router.get('/deleteFile', function (req, res) {
  res.send(fmapi.deleteFM(req.query.server, req.query.path));
});

router.get('/renameFile', function (req, res) {
  res.send(fmapi.renameFM(req.query.server, req.query.path, req.query.newname));
});

router.get('/newDirectory', function (req, res) {
  res.send(fmapi.newdirFM(req.query.server, req.query.path, req.query.newdir));
});

module.exports = router;