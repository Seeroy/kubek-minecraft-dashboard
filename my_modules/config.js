const fs = require('fs');
const CONFIG_VERSION = 1;
const defaultConfig = '{"lang":"en", "ftpd":false,"ftpd-user":"kubek","ftpd-password":"kubek","auth":false,"internet-access":true,"save-logs":true,"config-version":1,"tgbot-enabled":false,"tgbot-token":null,"tgbot-chatid":[]}';
const defaultUsersConfig = '{"kubek": {"username": "kubek","password": "72ba608dbfac8d46d4aaf40f428badf85af1f929fece7480e56602b4452a71fe","mail": "","hash": "","permissions": ["console", "plugins", "filemanager", "server_settings", "kubek_settings"]}}';
var SHA256 = require("crypto-js/sha256");
var crypto = require("crypto");

exports.readConfig = () => {
  if (!fs.existsSync("config.json")) {
    this.writeDefaultConfig();
    parse = JSON.parse(defaultConfig);
    return parse;
  } else {
    parse = JSON.parse(fs.readFileSync("config.json"));
    // FOR BACKWARD COMPABILITY
    if (typeof parse['internet-access'] === "undefined") {
      parse['internet-access'] = false;
    }
    if (typeof parse['tgbot-enabled'] === "undefined") {
      parse['tgbot-enabled'] = false;
    }
    if (typeof parse['tgbot-token'] === "undefined") {
      parse['tgbot-token'] = "";
    }
    if (typeof parse['tgbot-chatid'] === "undefined") {
      parse['tgbot-chatid'] = [];
    }
    if (typeof parse['config-version'] === "undefined") {
      parse['config-version'] = CONFIG_VERSION;
    }
    if (typeof parse['owner-password'] !== "undefined") {
      users__cfg = this.readUsersConfig();
      users__cfg['kubek']['password'] = SHA256(parse['owner-password']).toString();
      this.writeUsersConfig(users__cfg);
      parse['owner-password'] = "";
      parse['owner-user'] = "";
      delete parse['owner-password'];
      delete parse['owner-user'];
      this.writeConfig(parse);
    }
    if (typeof parse['save-logs'] === "undefined") {
      parse['save-logs'] = false;
    }
    return parse;
  }
}

exports.readUsersConfig = () => {
  if (!fs.existsSync("users.json")) {
    ret = this.writeDefaultUsersConfig();
    return ret;
  } else {
    parsess = JSON.parse(fs.readFileSync("users.json"));
    return parsess;
  }
}

exports.writeConfig = (config) => {
  fs.writeFileSync("config.json", JSON.stringify(config, null, "\t"))
}

exports.writeUsersConfig = (config) => {
  fs.writeFileSync("users.json", JSON.stringify(config, null, "\t"))
}

exports.writeServersJSON = (config) => {
  fs.writeFileSync("./servers/servers.json", JSON.stringify(config, null, "\t"))
}

exports.writeDefaultConfig = () => {
  parse = JSON.parse(defaultConfig);
  userLang = detectUserLocale();
  parse["lang"] = userLang;
  fs.writeFileSync("config.json", JSON.stringify(parse));
}

exports.writeDefaultUsersConfig = () => {
  newHash = crypto.randomUUID().toString();
  du = JSON.parse(defaultUsersConfig);
  du['kubek']['hash'] = newHash;
  fs.writeFileSync("users.json", JSON.stringify(du, null, "\t"));
  return du;
}

exports.readServersJSON = () => {
  if (fs.existsSync("./servers/servers.json")) {
    return JSON.parse(fs.readFileSync("./servers/servers.json"));
  } else {
    return false;
  }
}

function detectUserLocale() {
  locale = Intl.DateTimeFormat().resolvedOptions().locale.toString().split('-')[0];
  if(locale != 'ru' && locale != 'nl'){
    locale = 'en';
  }
  return locale.toLowerCase();
}