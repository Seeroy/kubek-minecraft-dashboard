const fs = require('fs');
const defaultConfig = '{"lang":"en", "ftpd":false,"ftpd-user":"kubek","ftpd-password":"kubek","auth":false,"owner-user":"kubek","owner-password":"kubek"}';

exports.readConfig = () => {
  if (!fs.existsSync("config.json")) {
    this.writeDefaultConfig();
    return JSON.parse(defaultConfig);
  } else {
    return JSON.parse(fs.readFileSync("config.json"));
  }
}

exports.writeConfig = (config) => {
  fs.writeFileSync("config.json", config)
}

exports.writeDefaultConfig = () => {
  fs.writeFileSync("config.json", defaultConfig);
}

exports.readServersJSON = () => {
  if(fs.existsSync("./servers/servers.json")){
    return JSON.parse(fs.readFileSync("./servers/servers.json"));
  } else {
    return false;
  }
}