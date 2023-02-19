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
    if (process.platform == "linux") {
      datat = fs.readFileSync("./servers/" + name + "/start.sh");
    } else {
      datat = fs.readFileSync("./servers/" + name + "/start.bat");
    }
    datat = datat.toString().split("\n");
    return datat[datat.length - 1];
  } else {
    return false;
  }
}

exports.saveStartScript = (name, script, resonerr) => {
  if (fs.existsSync("./servers/" + name)) {
    if (process.platform == "linux") {
      datat = fs.readFileSync("./servers/" + name + "/start.sh");
    } else {
      datat = fs.readFileSync("./servers/" + name + "/start.bat");
    }
    datat = datat.toString().split("\n");
    datat[datat.length - 1] = Buffer.from(script, 'base64').toString("ascii");
    if (process.platform == "linux") {
      fs.writeFileSync("./servers/" + name + "/start.sh", datat.join("\n"));
    } else {
      fs.writeFileSync("./servers/" + name + "/start.bat", datat.join("\n"));
    }
    srv = JSON.parse(fs.readFileSync("./servers/servers.json"));
    if(resonerr == "true"){
      srv[name]['restartOnError'] = true;
    } else {
      srv[name]['restartOnError'] = false;
    }
    config.writeServersJSON(srv);
    return true;
  } else {
    return false;
  }
}

exports.getServerProperties = (name) => {
  if (typeof name !== "undefined" && fs.existsSync("./servers/" + name + "/server.properties")) {
    data = fs.readFileSync("./servers/" + name + "/server.properties");
    return spParser.parse(data.toString());
  } else {
    return false;
  }
}

exports.saveServerProperties = (name, doc) => {
  fs.writeFileSync("./servers/" + name + "/server.properties", doc);
  return true;
}

exports.queryServer = (name, cb) => {
  data = this.getServerProperties(name);
  if (process.platform == "linux") { // mcutil is not crossplatform
    osutils.cpuUsage(function (value) {
      data["cpu"] = Math.round(value * 100);
      totalmem = os.totalmem();
      usedmem = totalmem - os.freemem();
      data["usedmem"] = usedmem;
      data["totalmem"] = totalmem;
      cb(data);
    });
  } else {
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

}

exports.listServers = () => {
  if (fs.existsSync("./servers/servers.json")) {
    files = fs.readdirSync("./servers");
    files.splice(files.indexOf("servers.json"), 1);
  } else {
    files = [];
  }
  return files;
}