var config = require("./config");
var usersConfig = config.readUsersConfig();
var SHA256 = require("crypto-js/sha256");
var crypto = require("crypto");

var PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,64}$/g;
var LOGIN_REGEX = /^[a-zA-Z0-9_.-]{3,16}$/g;
var EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;

exports.authorize = (hash, login) => {
  var authsucc = false;
  cfg = config.readConfig();
  this.reloadUsersConfig();
  users = usersConfig;
  if (cfg.auth == false) {
    authsucc = true;
  } else {
    if (typeof hash !== "undefined" && hash != "") {
      if (
        typeof users[login] !== "undefined" &&
        users[login].username !== "undefined" &&
        users[login].username.length > 0
      ) {
        if (users[login].hash == hash) {
          authsucc = true;
        }
      }
    }
  }
  return authsucc;
};

exports.login = (password, login) => {
  var authsucc = false;
  cfg = config.readConfig();
  this.reloadUsersConfig();
  users = usersConfig;
  if (cfg.auth == false) {
    authsucc = true;
  } else {
    if (typeof password !== "undefined" && password != "") {
      if (
        typeof users[login] !== "undefined" &&
        users[login].username !== "undefined" &&
        users[login].username.length > 0
      ) {
        if (users[login].password == SHA256(password)) {
          authsucc = true;
        }
      }
    }
  }
  return authsucc;
};

exports.addNewUser = (password, login, permissions, mail) => {
  success = false;
  cfg = config.readConfig();
  this.reloadUsersConfig();
  users = usersConfig;

  if (login == "kubek") {
    success = "You can`t use this function on admin account";
  } else {
    if (cfg.auth == false) {
      success = "Auth is disabled";
    } else {
      if (Object.keys(users).length >= 6) {
        success = "Users count is limited to 5 users";
      } else {
        if (
          mail == null ||
          typeof mail == "undefined" ||
          mail.match(EMAIL_REGEX)
        ) {
          if (login.match(LOGIN_REGEX) && password.match(PASSWORD_REGEX)) {
            if (typeof users[login] == "undefined") {
              newUserHash = crypto.randomUUID().toString();
              if (permissions[0] == "") {
                permissions = [];
              }
              users[login] = {
                username: login,
                password: SHA256(password).toString(),
                hash: newUserHash,
                permissions: permissions,
                mail: mail,
              };
              config.writeUsersConfig(users);
              success = true;
            } else {
              success = "User already exists";
            }
          } else {
            success = "Not matching regex";
          }
        } else {
          success = "Not matching regex";
        }
      }
    }
  }
  return success;
};

exports.regenUserHash = (login) => {
  success = false;
  cfg = config.readConfig();
  this.reloadUsersConfig();
  users = usersConfig;

  if (cfg.auth == false) {
    success = "Auth is disabled";
  } else {
    if (login.match(LOGIN_REGEX)) {
      if (typeof users[login] !== "undefined") {
        newUserHash = crypto.randomUUID().toString();
        users[login]["hash"] = newUserHash;
        config.writeUsersConfig(users);
        success = true;
      } else {
        success = "User not exists";
      }
    } else {
      success = "Not matching regex";
    }
  }
  return success;
};

exports.changeAdminPass = (oldPass, newPass) => {
  success = false;
  cfg = config.readConfig();
  this.reloadUsersConfig();
  users = usersConfig;

  if (cfg.auth == false) {
    success = "Auth is disabled";
  } else {
    op_hash = SHA256(oldPass).toString();
    np_hash = SHA256(newPass).toString();
    if (users["kubek"]["password"] == op_hash) {
      users["kubek"]["password"] = np_hash;
      newUserHash = crypto.randomUUID().toString();
      users["kubek"]["hash"] = newUserHash;
      config.writeUsersConfig(users);
      success = true;
    } else {
      success = "Old password is incorrect";
    }
  }
  return success;
};

exports.deleteUser = (login) => {
  success = false;
  cfg = config.readConfig();
  this.reloadUsersConfig();
  users = usersConfig;

  if (login == "kubek") {
    success = "You can`t use this function on admin account";
  } else {
    if (cfg.auth == false) {
      success = "Auth is disabled";
    } else {
      if (login.match(LOGIN_REGEX)) {
        if (typeof users[login] !== "undefined") {
          users[login] = "";
          delete users[login];
          config.writeUsersConfig(users);
          success = true;
        } else {
          success = "User not exists";
        }
      } else {
        success = "Not matching regex";
      }
    }
  }
  return success;
};

exports.editUser = (login, permissions, mail) => {
  success = false;
  cfg = config.readConfig();
  this.reloadUsersConfig();
  users = usersConfig;

  if (login == "kubek") {
    success = "You can`t use this function on admin account";
  } else {
    if (cfg.auth == false) {
      success = "Auth is disabled";
    } else {
      if (
        mail == null ||
        mail == "" ||
        typeof mail == "undefined" ||
        mail.match(EMAIL_REGEX)
      ) {
        if (login.match(LOGIN_REGEX)) {
          if (typeof users[login] !== "undefined") {
            users[login]["mail"] = mail;
            if (permissions[0] == "") {
              permissions = [];
            }
            newUserHash = crypto.randomUUID().toString();
            users[login]["permissions"] = permissions;
            users[login]["hash"] = newUserHash;
            config.writeUsersConfig(users);
            success = true;
          } else {
            success = "User not exists";
          }
        } else {
          success = "Not matching regex";
        }
      } else {
        success = "Not matching regex";
      }
    }
  }
  return success;
};

exports.getUserPermissions = (req) => {
  cfggg = config.readConfig();
  if (cfggg.auth == true) {
    hash = req.cookies["kbk__hash"];
    login = req.cookies["kbk__login"];

    auth = this.authorize(hash, login);
    if (
      auth == true &&
      typeof login !== "undefined" &&
      typeof hash !== "undefined" &&
      login.length > 0 &&
      hash.length > 0
    ) {
      if (
        typeof usersConfig[login] !== "undefined" &&
        typeof usersConfig[login].permissions !== "undefined"
      ) {
        return usersConfig[login].permissions;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } else {
    arr = [
      "console",
      "plugins",
      "filemanager",
      "server_settings",
      "kubek_settings",
      "backups",
    ];
    return arr;
  }
};

exports.reloadUsersConfig = () => {
  usersConfig = config.readUsersConfig();
};
