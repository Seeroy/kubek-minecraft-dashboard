var express = require('express');
var router = express.Router();
var fs = require('fs');
var additional = require('./../my_modules/additional');
var statsCollector = require('./../my_modules/statistics');
var config = require("./../my_modules/config");
var kubek = require("./../my_modules/kubek");
var ftpd = require("./../my_modules/ftpd");
var translator = require("./../my_modules/translator");
const nodeDiskInfo = require('node-disk-info');
const os = require("os");
const auth_manager = require("./../my_modules/auth_manager");

const ACCESS_PERMISSION = "kubek_settings";

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

router.get('/javaVersions', function (req, res) {
  res.set('Content-Type', 'application/json');
  if (process.platform == "win32") {
    directories = ["C:/Program Files", "C:/Program Files(x86)", "C:/Program Files (x86)"]
    tree = ["Java", "JDK", "OpenJDK", "OpenJRE", "Adoptium", "JRE", "AdoptiumJRE", "Temurin"];
    javas = [];
    directories.forEach(function (mainDir) {
      tree.forEach(function (inner) {
        directory = mainDir + "/" + inner;
        if (fs.existsSync(directory)) {
          fs.readdirSync(directory).forEach(function (jvs) {
            if (fs.existsSync(directory + "/" + jvs + "/bin/java.exe")) {
              javas.push(directory + "/" + jvs + "/bin/java.exe");
            }
          });
        }
      });
    });
  } else {
    javas = ["java"];
  }
  res.send(javas);
});

router.get('/verToJava', function (req, res) {
  ver = req.query.version;
  if (typeof ver !== "undefined") {
    sec = ver.split(".")[1];
    ter = ver.split(".")[2];
    if(sec < 8){
      java = "Java 8 (1.8.0)";
    } else if(sec >= 8 && sec <= 11){
      java = "Java 8";
    } else if(sec >= 12 && sec <= 15){
      java = "Java 11";
    } else if(sec == 16){
      if(ter <= 4){
        java = "Java 11";
      } else {
        java = "Java 17";
      }
    } else if(sec >= 17){
      java = "Java 17+";
    }
    res.send(java);
  } else {
    res.send(false);
  }
});

router.get('/version', function (req, res) {
  res.send(kubek_version);
});

router.get('/translate', function (req, res) {
  cfgg = config.readConfig();
  lang = cfgg['lang'];
  trs = translator.translateHTML(req.query.text, lang);
  res.send(trs);
});

router.get('/setFTPDStatus', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    ftpd.stopFTPD();
    setTimeout(function () {
      if (req.query.value == "true") {
        if (process.platform == "linux") {
          console.log("Currently FTP cannot be used on Linux, sorry");
          cfg = fs.readFileSync("./config.json");
          cfg = JSON.parse(cfg);
          cfg.ftpd = false;
        } else {
          ftpserver = ftpd.startFTPD();
          cfg = fs.readFileSync("./config.json");
          cfg = JSON.parse(cfg);
          cfg.ftpd = true;
        }
      } else {
        ftpd.stopFTPD();
        cfg = fs.readFileSync("./config.json");
        cfg = JSON.parse(cfg);
        cfg.ftpd = false;
      }
      config.writeConfig(cfg);
      res.send("true");
    }, 500);
  } else {
    res.status(403).send();
  }
});

router.get('/updates', function (req, res) {
  res.send(updatesByIntArray);
});

router.get('/support-uid', function (req, res) {
  res.send(statsCollector.supportUID());
});

router.get('/config', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    res.send(config.readConfig());
  } else {
    res.status(403).send();
  }
});

router.get('/usage', function (req, res) {
  kubek.getUsage(function (usage) {
    res.send(usage);
  });
});

router.get('/saveConfig', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    if (req.query.data != null && typeof req.query.data !== "undefined") {
      fs.writeFileSync("./config.json", req.query.data);
      res.send("true");
    } else {
      res.send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.get('/hardware', function (req, res) {
  nodeDiskInfo.getDiskInfo()
    .then(disks => {
      cpu = os.cpus()[0]['model'];
      cp_unq = os.cpus();
      let pform_unq = {
        name: os.type(),
        release: os.release(),
        arch: process.arch,
        version: os.version()
      }

      let cpu_unq = {
        model: cp_unq[0].model,
        speed: cp_unq[0].speed,
        cores: cp_unq.length
      }

      hardware = {
        platform: pform_unq,
        totalmem: Math.round(os.totalmem() / 1024 / 1024),
        cpu: cpu_unq,
        enviroment: process.env,
        disks: disks
      }
      res.send(hardware);
    })
    .catch(reason => {
      console.error(reason);
    });
});

module.exports = router;