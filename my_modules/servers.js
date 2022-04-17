const config = require("./config");
var spParser = require("minecraft-server-properties");
const fs = require('fs');
const mcutil = require("minecraft-status").MinecraftQuery;
const osutils = require('os-utils');
const os = require('os');

exports.getStatuses = () => {
  return config.readServersJSON();
}

exports.getStartScript = (name) => {
  if (fs.existsSync("./servers/" + name)) {
    datat = fs.readFileSync("./servers/" + name + "/start.bat");
    datat = datat.toString().split("\n");
    return datat[datat.length - 1];
  } else {
    return false;
  }
}

exports.saveStartScript = (name, script) => {
  if (fs.existsSync("./servers/" + name)) {
    datat = fs.readFileSync("./servers/" + name + "/start.bat");
    datat = datat.toString().split("\n");
    datat[datat.length - 1] = Buffer.from(script, 'base64').toString("ascii");
    fs.writeFileSync("./servers/" + name + "/start.bat", datat.join("\n"));
    return true;
  } else {
    return false;
  }
}

exports.getServerProperties = (name) => {
  data = fs.readFileSync("./servers/" + name + "/server.properties");
  return spParser.parse(data.toString());
}

exports.saveServerProperties = (name, doc) => {
  fs.writeFileSync("./servers/" + name + "/server.properties", Buffer.from(doc, 'base64').toString('ascii'));
  return true;
}

exports.queryServer = (name, cb) => {
  data = this.getServerProperties(name);
  mcutil.fullQuery("127.0.0.1", data["server-port"], 3000)
    .then((data) => {
      osutils.cpuUsage(function (value) {
        data["cpu"] = Math.round(value * 100);
        totalmem = os.totalmem();
        usedmem = totalmem - os.freemem();
        data["usedmem"] = usedmem;
        data["totalmem"] = totalmem;
        cb(data);
      });
    })
    .catch((error) => {
      console.error(error);
      cb(error);
    });
}

exports.listServers = () => {
  if(fs.existsSync("./servers/servers.json")){
    files = fs.readdirSync("./servers");
    files.splice(files.indexOf("servers.json"), 1);
  } else {
    files = [];
  }
  return files;
}