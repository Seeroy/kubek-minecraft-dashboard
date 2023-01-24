var express = require('express');
var router = express.Router();
var additional = require("./../my_modules/additional");
var path = require('path');
var fs = require('fs');
const auth_manager = require("./../my_modules/auth_manager");
var config = require("./../my_modules/config");

const ACCESS_PERMISSION = "server_settings";
const ACCESS_PERMISSION_2 = "plugins";
const ACCESS_PERMISSION_3 = "filemanager";

router.use(function (req, res, next) {
  additional.showRequestInLogs(req, res);
  cfg = config.readConfig();
  ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    res.send("Cannot be accessed from the internet");
  } else {
    authsucc = auth_manager.authorize(req.cookies["kbk__hash"], req.cookies["kbk__login"]);
    if (authsucc == true) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.post('/icon', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    sampleFile = req.files['g-img-input'];
    uploadPath = "./servers/" + req.query["server"] + "/server-icon.png";

    if (path.extname(sampleFile.name) == ".png") {
      sampleFile.mv(uploadPath, function (err) {
        if (err)
          return res.status(400).send(err);

        res.send("uploaded");
      });
    } else {
      return res.status(400).send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.post('/core', function (req, res) {
  if (!fs.existsSync("./servers")) {
    fs.mkdirSync("./servers");
  }
  fs.mkdirSync("./servers/" + req.query["server"]);
  let sampleFile;
  let uploadPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  sampleFile = req.files['g-core-input'];
  uploadPath = "./servers/" + req.query["server"] + "/" + sampleFile.name;

  if (path.extname(sampleFile.name) == ".jar") {
    sampleFile.mv(uploadPath, function (err) {
      if (err)
        return res.status(400).send(err);

      res.send("uploaded");
    });
  } else {
    return res.status(400).send("false");
  }
});

router.post('/plugin', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION_2)) {
    if (!fs.existsSync("./servers/" + req.query["server"] + "/plugins")) {
      fs.mkdirSync("./servers/" + req.query["server"] + "/plugins");
    }
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    sampleFile = req.files['g-plugin-input'];
    uploadPath = "./servers/" + req.query["server"] + "/plugins/" + sampleFile.name;

    if (path.extname(sampleFile.name) == ".jar") {
      sampleFile.mv(uploadPath, function (err) {
        if (err)
          return res.status(400).send(err);

        res.send("uploaded");
      });
    } else {
      return res.status(400).send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.post('/mod', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION_2)) {
    if (!fs.existsSync("./servers/" + req.query["server"] + "/mods")) {
      fs.mkdirSync("./servers/" + req.query["server"] + "/mods");
    }
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    sampleFile = req.files['g-mod-input'];
    uploadPath = "./servers/" + req.query["server"] + "/mods/" + sampleFile.name;

    if (path.extname(sampleFile.name) == ".jar") {
      sampleFile.mv(uploadPath, function (err) {
        if (err)
          return res.status(400).send(err);

        res.send("uploaded");
      });
    } else {
      return res.status(400).send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.post('/file', (request, response) => {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION_3)) {
    let sampleFile;
    let uploadPath;

    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).send('No files were uploaded.');
    }

    sampleFile = request.files['g-file-input'];
    uploadPath = "./servers/" + request.query["server"] + request.query["path"] + sampleFile.name;

    sampleFile.mv(uploadPath, function (err) {
      if (err)
        return response.status(400).send(err);

      response.send("uploaded");
    });
  } else {
    res.status(403).send();
  }
});

module.exports = router;