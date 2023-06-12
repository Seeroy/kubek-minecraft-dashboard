const config = require("./config");
var spParser = require("minecraft-server-properties");
const fs = require("fs");
const jobscheduler = require("node-schedule");
const mcutil = require("minecraft-server-util");
const osutils = require("os-utils");
const os = require("os");
const errors_parser = require("./../my_modules/errors.mc.parser");
const translator = require("./../my_modules/translator");
const sockets = require("./../my_modules/sockets");
var path = require("path");
var iconvlite = require("iconv-lite");
const { spawn } = require("node:child_process");
var additional = require("./../my_modules/additional");
var tgbot = require("./../my_modules/tgbot");
var colors = require("colors");

var oldConsoleStamp = 0;

exports.getStatuses = () => {
  rd = config.readServersJSON();
  newrd = {};
  Object.keys(rd).forEach(function (key) {
    rstatus = rd[key]["status"];
    rtrans = translator.translateHTML(
      "{{status-" + rstatus + "}}",
      cfg["lang"]
    );
    newrd[key] = rd[key];
    newrd[key]["statusTranslated"] = rtrans;
  });
  return newrd;
};

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
};

exports.saveStartScript = (name, script, resonerr) => {
  if (fs.existsSync("./servers/" + name)) {
    if (process.platform == "linux") {
      datat = fs.readFileSync("./servers/" + name + "/start.sh");
    } else {
      datat = fs.readFileSync("./servers/" + name + "/start.bat");
    }
    datat = datat.toString().split("\n");
    datat[datat.length - 1] = Buffer.from(script, "base64").toString("ascii");
    if (process.platform == "linux") {
      fs.writeFileSync("./servers/" + name + "/start.sh", datat.join("\n"));
    } else {
      fs.writeFileSync("./servers/" + name + "/start.bat", datat.join("\n"));
    }
    srv = JSON.parse(fs.readFileSync("./servers/servers.json"));
    if (resonerr == "true") {
      srv[name]["restartOnError"] = true;
    } else {
      srv[name]["restartOnError"] = false;
    }
    config.writeServersJSON(srv);
    return true;
  } else {
    return false;
  }
};

exports.getServerProperties = (name) => {
  if (
    typeof name !== "undefined" &&
    fs.existsSync("./servers/" + name + "/server.properties")
  ) {
    data = fs.readFileSync("./servers/" + name + "/server.properties");
    return spParser.parse(data.toString());
  } else {
    return false;
  }
};

exports.saveServerProperties = (name, doc) => {
  fs.writeFileSync("./servers/" + name + "/server.properties", doc);
  return true;
};

exports.queryServer = (name, cb) => {
  data = this.getServerProperties(name);
  if (data["enable-query"] == true) {
    mcu_options = {
      timeout: 1000 * 5,
      enableSRV: false,
    };
    mcutil
      .status("127.0.0.1", data["query.port"], mcu_options)
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
  } else if (data["enable-query"] == false) {
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
};

exports.disableAllScheduled = () => {
  jobscheduler.gracefulShutdown();
};

exports.scheduleServerRestart = (crontab_text, server) => {
  jobscheduler.scheduleJob(crontab_text, function () {
    if (serverjson_cfg[server]["status"] == "started") {
      restart_after_stop[server] = true;
      command = Buffer.from("stop", "utf-8").toString();
      servers_logs[server] = servers_logs[server] + command + "\n";
      servers_instances[server].stdin.write(command + "\n");
      additional.showAnyCustomMessage(
        "Running restart job for " + server + " is " + colors.green("success"),
        "JOBS"
      );
      tgbot.runningSchedNotification(server, true);
    } else {
      additional.showAnyCustomMessage(
        "Running restart job for " +
          server +
          " " +
          colors.yellow("can`t be done"),
        "JOBS"
      );
      tgbot.runningSchedNotification(server, false);
    }
  });
};

exports.rescheduleAllServers = () => {
  jobscheduler.gracefulShutdown().then(function () {
    jobscount = 0;
    for (const [key, value] of Object.entries(serverjson_cfg)) {
      if (
        typeof serverjson_cfg[key]["restartScheduler"] !== "undefined" &&
        serverjson_cfg[key]["restartScheduler"]["enabled"] == "true"
      ) {
        module.exports.scheduleServerRestart(
          serverjson_cfg[key]["restartScheduler"]["crontab"],
          key
        );
        jobscount++;
      }
    }
    additional.showAnyCustomMessage("Scheduled " + jobscount + " jobs", "JOBS");
  });
};

exports.listServers = () => {
  if (fs.existsSync("./servers/servers.json")) {
    files = fs.readdirSync("./servers");
    files.splice(files.indexOf("servers.json"), 1);
  } else {
    files = [];
  }
  return files;
};

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
      console.log(
        colors.red(
          additional.getTimeFormatted() +
            " " +
            '"servers/' +
            server +
            '/start.bat"' +
            translator.translateHTML(" {{consolemsg-notfound-tr}}", cfg["lang"])
        )
      );
      start = false;
    }
  } else if (process.platform == "linux") {
    startFile = path.resolve("./servers/" + server + "/start.sh");
    if (fs.existsSync(startFile)) {
      try {
        servers_instances[server] = spawn("sh", [startFile]);
      } catch (error) {
        console.error(error);
      }
      start = true;
    } else {
      console.log(
        colors.red(
          additional.getTimeFormatted() +
            " " +
            '"servers/' +
            server +
            '/start.sh"' +
            translator.translateHTML(" {{consolemsg-notfound-tr}}", cfg["lang"])
        )
      );
      start = false;
    }
  } else {
    console.log(
      colors.red(
        additional.getTimeFormatted() +
          " " +
          process.platform +
          translator.translateHTML(" {{consolemsg-notsup}} ", cfg["lang"])
      )
    );
    start = false;
  }

  if (start == true) {
    serverjson_cfg = JSON.parse(fs.readFileSync("./servers/servers.json"));
    console.log(
      additional.getTimeFormatted(),
      translator.translateHTML("{{consolemsg-starting}} ", cfg["lang"]) + ":",
      server.green
    );
    currentStatus = "starting";
    serverjson_cfg[server].status = currentStatus;
    // On process close
    servers_instances[server].on("close", (code) => {
      currentStatus = "stopped";
      serverjson_cfg[server].status = currentStatus;
      tgbot.changedServerStatus(server, currentStatus);
      config.writeServersJSON(serverjson_cfg);
      sockets.emitPreparedToAllClients(
        io,
        "handleUpdate",
        "servers",
        this.getStatuses()
      );
      serverCloseEventHandler(server, code);
    });

    servers_instances[server].stdout.on("data", (data) => {
      serverStdoutEventHandler(server, data);
    });
    servers_instances[server].stderr.on("data", (data) => {
      serverStdoutEventHandler(server, data);
    });
    config.writeServersJSON(serverjson_cfg);
    sockets.emitPreparedToAllClients(
      io,
      "handleUpdate",
      "servers",
      this.getStatuses()
    );
  }
};

function startServer(server) {
  module.exports.startServer(server);
}

const STATUS_DETECTORS = {
  starting: [
    /Loading libraries/gim,
    /Advanced terminal features are/gim,
    /Enabled Waterfall version/gim,
    /Starting server/gim,
  ],
  started: [/Server started/gim, /Listening on/gim, /Done/gim],
  stopping: [/Saving players/gim, /Server stop requested/gim],
};

function serverStdoutEventHandler(server, data) {
  data = iconvlite.decode(data, "utf-8").toString();
  err = errors_parser.checkStringForErrors(data);
  if (err != false) {
    sockets.emitPreparedToAllClients(io, "handleServerError", "servers", err);
  }
  addToServerLogs(server, data.toString());
  if (Date.now() - oldConsoleStamp >= 150) {
    sockets.emitPreparedToAllClients(io, "handleUpdate", "console", {
      server: server,
      data: getLast100LinesOfLog(server),
    });
    oldConsoleStamp = Date.now();
  }
  Object.keys(STATUS_DETECTORS).forEach((key) => {
    value = STATUS_DETECTORS[key];
    value.forEach(function (rgx) {
      if (data.match(rgx) != null) {
        currentStatus = key;
        tgbot.changedServerStatus(server, currentStatus);
        return;
      }
    });
  });
  if (
    serverjson_cfg[server].status != currentStatus &&
    currentStatus == "started"
  ) {
    sockets.emitPreparedToAllClients(
      io,
      "handleUpdate",
      "server_status_changed",
      {
        message: translator.translateHTML(
          server + "{{toasts-start-success}}",
          cfg["lang"]
        ),
        type: "success",
      }
    );
  }
  if (serverjson_cfg[server].status != currentStatus) {
    writeSJ = true;
  } else {
    writeSJ = false;
  }
  serverjson_cfg[server].status = currentStatus;
  if (writeSJ == true) {
    config.writeServersJSON(serverjson_cfg);
    sockets.emitPreparedToAllClients(
      io,
      "handleUpdate",
      "servers",
      module.exports.getStatuses()
    );
  }
}

function serverCloseEventHandler(server, code) {
  if (code != null && code > 1 && code != 127) {
    // Really error happend
    tr = translator.translateHTML("{{consolemsg-stopwithcode}} ", cfg["lang"]);
    addToServerLogs(server, "\n" + servers_logs[server] + "§4" + tr + code);
    console.log(additional.getTimeFormatted(), tr + code + ":", server.red);

    sockets.emitPreparedToAllClients(
      io,
      "handleUpdate",
      "server_status_changed",
      {
        message: translator.translateHTML(
          server + "{{toasts-stop-code}}" + code,
          cfg["lang"]
        ),
        type: "warning",
      }
    );

    if (
      serverjson_cfg[server]["restartOnError"] == true &&
      errors_parser.checkStringForErrors(servers_logs[server]) == false
    ) {
      if (typeof servers_restart_count[server] == "undefined") {
        // Auto restart server on crash is starting
        servers_restart_count[server] = 1;
        console.log(
          additional.getTimeFormatted(),
          translator.translateHTML("{{consolemsg-restartatt}} ", cfg["lang"]) +
            "1 :",
          server.red
        );
        addToServerLogs(
          server,
          "\n" +
            translator.translateHTML(
              "{{consolemsg-restartatt}} ",
              cfg["lang"]
            ) +
            "1"
        );
        setTimeout(function () {
          startServer(server);
        }, 3000);
      } else {
        // 3 attempts to restart the server
        if (servers_restart_count[server] < 3) {
          servers_restart_count[server]++;
          console.log(
            additional.getTimeFormatted(),
            translator.translateHTML(
              "{{consolemsg-restartatt}} ",
              cfg["lang"]
            ) +
              servers_restart_count[server] +
              " :",
            server.red
          );
          addToServerLogs(
            server,
            "\n" +
              translator.translateHTML(
                "{{consolemsg-restartatt}} ",
                cfg["lang"]
              ) +
              servers_restart_count[server]
          );
          setTimeout(function () {
            startServer(server);
          }, 3000);
        } else {
          addToServerLogs(
            server,
            "\n§4" +
              translator.translateHTML(
                "{{consolemsg-cantbestarted}} ",
                cfg["lang"]
              )
          );
        }
      }
    }
  } else if (code == 1 || code == 127) {
    // Server is killed manually
    console.log(
      additional.getTimeFormatted(),
      translator.translateHTML("{{consolemsg-stopwithcode}} ", cfg["lang"]) +
        code +
        ":",
      server.yellow
    );

    sockets.emitPreparedToAllClients(
      io,
      "handleUpdate",
      "server_status_changed",
      {
        message: translator.translateHTML(
          server + "{{toasts-stop-code}}" + code,
          cfg["lang"]
        ),
        type: "warning",
      }
    );

    addToServerLogs(server, "\n§bKilled");
  } else {
    // Graceful shutdown
    console.log(
      additional.getTimeFormatted(),
      translator.translateHTML("{{consolemsg-stop}} ", cfg["lang"]) + ":",
      server.green
    );
    if (restart_after_stop[server] == true) {
      restart_after_stop[server] = null;
      delete restart_after_stop[server];
      setTimeout(function () {
        startServer(server);
      }, 500);
    }
    sockets.emitPreparedToAllClients(
      io,
      "handleUpdate",
      "server_status_changed",
      {
        message: translator.translateHTML(
          server + "{{toasts-stop-success}}",
          cfg["lang"]
        ),
        type: "success",
      }
    );
  }
  if (Date.now() - oldConsoleStamp >= 150) {
    sockets.emitPreparedToAllClients(io, "handleUpdate", "console", {
      server: server,
      data: getLast100LinesOfLog(server),
    });
    oldConsoleStamp = Date.now();
  }
}

function addToServerLogs(server, text) {
  maxLogsLength = -1000;
  servers_logs[server] = servers_logs[server] + text;
  servers_logs[server] = servers_logs[server]
    .split(/\r?\n/)
    .slice(maxLogsLength)
    .join("\r\n");
}

function getLast100LinesOfLog(server) {
  return servers_logs[server].split(/\r?\n/).slice(-100).join("\r\n");
}
