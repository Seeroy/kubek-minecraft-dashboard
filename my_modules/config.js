const fs = require('fs');
const defaultConfig = '{"lang":"en", "ftpd":false,"ftpd-user":"kubek","ftpd-password":"kubek","auth":false,"owner-user":"kubek","owner-password":"kubek","internet-access":false,"save-logs":true}';

exports.readConfig = () => {
  if (!fs.existsSync("config.json")) {
    this.writeDefaultConfig();
    parse = JSON.parse(defaultConfig);
    return parse;
  } else {
    parse = JSON.parse(fs.readFileSync("config.json"));
    // FOR BACKWARD COMPABILITY
    if(typeof parse['internet-access'] === "undefined"){
      parse['internet-access'] = false;
    }
    if(typeof parse['save-logs'] === "undefined"){
      parse['save-logs'] = false;
    }
    return parse;
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