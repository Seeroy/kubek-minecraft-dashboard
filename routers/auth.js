var express = require('express');
var router = express.Router();
var additional = require("./../my_modules/additional");
var config = require("./../my_modules/config");
const auth_manager = require("./../my_modules/auth_manager");
var tgbot = require("./../my_modules/tgbot");

const ACCESS_PERMISSION = "kubek_settings";

router.use(function (req, res, next) {
  additional.showRequestInLogs(req, res);
  if (req["_parsedUrl"].pathname != "/login") {
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
  } else {
    next();
  }
});

router.get('/login', function (req, res) {
  password = req.query.password;
  login = req.query.login;
  additional.showMyMessageInLogs(req, res, "Trying to login into " + login);
  mainConfig = config.readConfig();
  if (mainConfig.auth == true) {
    authsucc = auth_manager.login(password, login);
    ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
    tgbot.sendNewAuth(authsucc, login, ip);
    if (authsucc == true) {
      let options = {
        maxAge: 120 * 24 * 60 * 60 * 1000,
        httpOnly: true
      }
      res.cookie("kbk__hash", users[login].hash, options);
      res.cookie("kbk__login", users[login].username, options);
      res.redirect("/");
      additional.showMyMessageInLogs(req, res, "User " + login + " successfully logged in");
    } else {
      additional.showMyMessageInLogs(req, res, "User " + login + " used wrong credentials");
      res.send("Wrong credetinals!");
    }
  } else {
    additional.showMyMessageInLogs(req, res, "Auth is disabled, skipping checks");
    res.redirect("/");
  }
});

router.get('/permissions', function (req, res) {
  cfg = config.readConfig();
  if (cfg['auth'] == true) {
    perms = auth_manager.getUserPermissions(req);
    res.send(perms);
  } else {
    res.send([
      "console",
      "plugins",
      "filemanager",
      "server_settings",
      "kubek_settings",
      "backups"
    ]);
  }
});

router.get('/listUsers', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    users = config.readUsersConfig();
    res.send(users);
  } else {
    res.status(403).send();
  }
});

router.get('/getUserInfo', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    users = config.readUsersConfig();
    username = req.query.username;
    if (typeof username !== "undefined" && username.length > 0) {
      usrinfo = users[username];
      res.send(usrinfo);
    } else {
      res.send(false);
    }
  } else {
    res.status(403).send();
  }
});

router.get('/newUser', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    result = false;
    login = req.query.login;
    password = req.query.password;
    mail = req.query.mail;
    permissions = req.query.permissions;
    if (typeof login !== "undefined" && typeof password !== "undefined" && login.length > 0 && password.length > 0) {
      permissions = permissions.split(",");
      if (typeof permissions == "object") {
        result = auth_manager.addNewUser(password, login, permissions, mail);
      }
      res.send(result);
    } else {
      res.send(false);
    }
  } else {
    res.status(403).send();
  }
});

router.get('/logout', function (req, res) {
  cfg = config.readConfig();
  if (cfg['auth'] == true) {
    login = req.cookies['kbk__login'];
    hash = req.cookies['kbk__hash'];
    if (typeof login !== "undefined" && typeof hash !== "undefined" && login.length > 0 && hash.length > 0) {
      res.clearCookie("kbk__login");
      res.clearCookie("kbk__hash");
      res.redirect("/login.html");
      res.end();
    } else {
      res.send(false);
    }
  } else {
    res.redirect("/");
  }
});

router.get('/editUser', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    result = false;
    login = req.query.login;
    mail = req.query.mail;
    permissions = req.query.permissions;
    if (typeof login !== "undefined" && login.length > 0) {
      permissions = permissions.split(",");
      result = auth_manager.editUser(login, permissions, mail);
      res.send(result);
    } else {
      res.send(false);
    }
  } else {
    res.status(403).send();
  }
});

router.get('/changeAdminPass', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    result = false;
    oldPass = req.query.oldPass;
    newPass = req.query.newPass;
    if (typeof oldPass !== "undefined" && typeof newPass !== "undefined" && oldPass.length > 0 && newPass.length > 0) {
      result = auth_manager.changeAdminPass(oldPass, newPass);
      res.send(result);
    } else {
      res.send(false);
    }
  } else {
    res.status(403).send();
  }
});

router.get('/deleteUser', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    result = false;
    login = req.query.login;
    if (typeof login !== "undefined" && login.length > 0) {
      result = auth_manager.deleteUser(login);
      res.send(result);
    } else {
      res.send(false);
    }
  } else {
    res.status(403).send();
  }
});

router.get('/regenUserHash', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    result = false;
    login = req.query.login;
    if (typeof login !== "undefined" && login.length > 0) {
      result = auth_manager.regenUserHash(login);
      res.send(result);
    } else {
      res.send(false);
    }
  } else {
    res.status(403).send();
  }
});

module.exports = router;