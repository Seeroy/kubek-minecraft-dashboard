const config = require("./config");
var spParser = require("minecraft-server-properties");
const fs = require('fs');
const jobscheduler = require('node-schedule');
const mcutil = require('minecraft-server-util');
const osutils = require('os-utils');
const os = require('os');
const errors_parser = require("./../my_modules/errors.mc.parser");
const translator = require('./../my_modules/translator');
var path = require('path');
var iconvlite = require('iconv-lite');
const {
  spawn
} = require('node:child_process');
var additional = require('./../my_modules/additional');
var tgbot = require('./../my_modules/tgbot');
var colors = require("colors");

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
    if (resonerr == "true") {
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
  if (data['enable-query'] == true) {
    mcu_options = {
      timeout: 1000 * 5,
      enableSRV: false
    };
    mcutil.status('127.0.0.1', data["query.port"], mcu_options)
      .then(function (data) {
        osutils.cpuUsage(function (value) {
          data["cpu"] = Math.round(value * 100);
          totalmem = os.totalmem();
          usedmem = totalmem - os.freemem();
          data["usedmem"] = usedmem;
          data["totalmem"] = totalmem;
          cb(data);
        });
      })
      .catch((error) => console.error(error));
  } else if (data['enable-query'] == false) {
    data = {};
    osutils.cpuUsage(function (value) {
      data["cpu"] = Math.round(value * 100);
      totalmem = os.totalmem();
      usedmem = totalmem - os.freemem();
      data["usedmem"] = usedmem;
      data["totalmem"] = totalmem;
      cb(data);
    });
  }
}

exports.disableAllScheduled = () => {
  jobscheduler.gracefulShutdown();
}

exports.scheduleServerRestart = (crontab_text, server) => {
  jobscheduler.scheduleJob(crontab_text, function () {
    if (serverjson_cfg[server]['status'] == 'started') {
      restart_after_stop[server] = true;
      command = Buffer.from("stop", 'utf-8').toString();
      servers_logs[server] = servers_logs[server] + command + "\n";
      servers_instances[server].stdin.write(command + '\n');
      additional.showAnyCustomMessage("Running restart job for " + server + " is " + colors.green("success"), "JOBS");
      tgbot.runningSchedNotification(server, true);
    } else {
      additional.showAnyCustomMessage("Running restart job for " + server + " " + colors.yellow("can`t be done"), "JOBS");
      tgbot.runningSchedNotification(server, false);
    }
  });
}

exports.rescheduleAllServers = () => {
  jobscheduler.gracefulShutdown()
    .then(function () {
      jobscount = 0;
      for (const [key, value] of Object.entries(serverjson_cfg)) {
        if (typeof serverjson_cfg[key]['restartScheduler'] !== "undefined" && serverjson_cfg[key]['restartScheduler']['enabled'] == 'true') {
          module.exports.scheduleServerRestart(serverjson_cfg[key]['restartScheduler']['crontab'], key);
          jobscount++;
        }
      }
      additional.showAnyCustomMessage("Scheduled " + jobscount + " jobs", "JOBS");
    })
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

exports.startServer = (server) => {
  servers_logs[server] = "";
  if (process.platform == "win32") {
    startFile = path.resolve("./servers/" + server + "/start.bat");
    if (fs.existsSync(startFile)) {
      try {
        servers_instances[server] = spawn(startFile);
      } catch (error) {
        console.error(error);
      }
      start = true;
    } else {
      console.log(colors.red(additional.getTimeFormatted() + " " + '"servers/' + server + '/start.bat"' + translator.translateHTML(" {{consolemsg-notfound-tr}}", cfg['lang'])));
      start = false;
    }
  } else if (process.platform == "linux") {
    startFile = path.resolve("./servers/" + server + "/start.sh");
    if (fs.existsSync(startFile)) {
      try {
        servers_instances[server] = spawn('sh', [startFile]);
      } catch (error) {
        console.error(error);
      }
      start = true;
    } else {
      console.log(colors.red(additional.getTimeFormatted() + " " + '"servers/' + server + '/start.sh"' + translator.translateHTML(" {{consolemsg-notfound-tr}}", cfg['lang'])));
      start = false;
    }
  } else {
    console.log(colors.red(additional.getTimeFormatted() + " " + process.platform + translator.translateHTML(" {{consolemsg-notsup}} ", cfg['lang'])));
    start = false;
  }

  if (start == true) {
    serverjson_cfg = JSON.parse(fs.readFileSync("./servers/servers.json"));
    console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-starting}} ", cfg['lang']) + ":", server.green);
    statuss = "starting";
    servers_instances[server].on('close', (code) => {
      statuss = "stopped";
      serverjson_cfg[server].status = statuss;
      tgbot.changedServerStatus(server, statuss);
      config.writeServersJSON(serverjson_cfg);
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "servers",
          data: this.getStatuses()
        });
      }
      if (code != 1 && code != null) {
        if (code != 0) {
          servers_logs[server] = servers_logs[server] + "§4" + translator.translateHTML("{{consolemsg-stopwithcode}} ", cfg['lang']) + code;
          console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-stopwithcode}} ", cfg['lang']) + code + ":", server.red);
          if (serverjson_cfg[server]['restartOnError'] == true && errors_parser.checkStringForErrors(servers_logs[server]) == false) {
            if (typeof servers_restart_count[server] == "undefined") {
              servers_restart_count[server] = 1;
              console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-restartatt}} ", cfg['lang']) + "1 :", server.red);
              servers_logs[server] = servers_logs[server] + "\n" + translator.translateHTML("{{consolemsg-restartatt}} ", cfg['lang']) + "1";
              setTimeout(function () {
                startServer(server);
              }, 3000);
            } else {
              if (servers_restart_count[server] < 3) {
                servers_restart_count[server]++;
                console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-restartatt}} ", cfg['lang']) + servers_restart_count[server] + " :", server.red);
                servers_logs[server] = servers_logs[server] + "\n" + translator.translateHTML("{{consolemsg-restartatt}} ", cfg['lang']) + servers_restart_count[server];
                setTimeout(function () {
                  startServer(server);
                }, 3000);
              } else {
                servers_logs[server] = servers_logs[server] + "\n§4" + translator.translateHTML("{{consolemsg-cantbestarted}}", cfg['lang']);
              }
            }
          }
        } else {
          console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-stop}} ", cfg['lang']) + ":", server.green);
          if (restart_after_stop[server] == true) {
            restart_after_stop[server] = null;
            delete restart_after_stop[server];
            setTimeout(function () {
              startServer(server);
            }, 500);
          }
        }
      } else {
        console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-stopwithcode}} ", cfg['lang']) + code + ":", server.yellow);
        servers_logs[server] = servers_logs[server] + "\n§bKilled";
      }
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        spl = servers_logs[server].split(/\r?\n/).slice(-100);
        socket[1].emit("handleUpdate", {
          type: "console",
          data: {
            server: server,
            data: spl.join("\r\n")
          }
        });
      }
    });
    servers_instances[server].stdout.on('data', (data) => {
      data = iconvlite.decode(data, "utf-8");
      err = errors_parser.checkStringForErrors(data.toString());
      if (err != false) {
        fsock = io.sockets.sockets;
        for (const socket of fsock) {
          socket[1].emit("handleServerError", {
            type: "servers",
            data: err
          });
        }
      }
      servers_logs[server] = servers_logs[server] + data.toString();
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        spl = servers_logs[server].split(/\r?\n/).slice(-100);
        socket[1].emit("handleUpdate", {
          type: "console",
          data: {
            server: server,
            data: spl.join("\r\n")
          }
        });
      }
      if (data.indexOf("Loading libraries, please wait...") >= 0) {
        statuss = "starting";
        tgbot.changedServerStatus(server, statuss);
      }
      if (data.indexOf("Done") >= 0) {
        statuss = "started";
        tgbot.changedServerStatus(server, statuss);
        console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-start}} ", cfg['lang']) + ":", server.green);
      }
      if (data.indexOf("Listening on /") >= 0) {
        statuss = "started";
        tgbot.changedServerStatus(server, statuss);
        console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-start}} ", cfg['lang']) + ":", server.green);
      }
      if (data.match(/\[INFO] Listening on/gm)) {
        statuss = "started";
        tgbot.changedServerStatus(server, statuss);
        console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-start}} ", cfg['lang']) + ":", server.green);
      }
      if (data.match(/\[INFO] Done/gm)) {
        statuss = "started";
        tgbot.changedServerStatus(server, statuss);
        console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-start}} ", cfg['lang']) + ":", server.green);
      }
      if (data.indexOf("Saving players") >= 0) {
        console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-stopping}} ", cfg['lang']) + ":", server.green);
        statuss = "stopping";
        tgbot.changedServerStatus(server, statuss);
      }
      serverjson_cfg[server].status = statuss;
      config.writeServersJSON(serverjson_cfg);
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "servers",
          data: this.getStatuses()
        });
      }
    });
    servers_instances[server].stderr.on('data', (data) => {
      data = iconvlite.decode(data, "utf-8");
      err = errors_parser.checkStringForErrors(data.toString());
      if (err != false) {
        fsock = io.sockets.sockets;
        for (const socket of fsock) {
          socket[1].emit("handleServerError", {
            type: "servers",
            data: err
          });
        }
      }
      servers_logs[server] = servers_logs[server] + "ERROR: " + data.toString();
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        spl = servers_logs[server].split(/\r?\n/).slice(-100);
        socket[1].emit("handleUpdate", {
          type: "console",
          data: {
            server: server,
            data: spl.join("\r\n")
          }
        });
      }
      serverjson_cfg[server].status = statuss;
      tgbot.changedServerStatus(server, statuss);
      config.writeServersJSON(serverjson_cfg);
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "servers",
          data: this.getStatuses()
        });
      }
    });
    config.writeServersJSON(serverjson_cfg);
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "servers",
        data: this.getStatuses()
      });
    }
  }
}

function startServer(server) {
  module.exports.startServer(server);
}