var express = require('express');
var router = express.Router();
var fs = require('fs');
var additional = require('./../my_modules/additional');
var config = require("./../my_modules/config");
var serverController = require("./../my_modules/servers");
var treekill = require('tree-kill');
const auth_manager = require("./../my_modules/auth_manager");
const tgbot_manager = require('./../my_modules/tgbot');

const ACCESS_PERMISSION = "server_settings";
const ACCESS_PERMISSION_2 = "console";

router.use(function (req, res, next) {
  if (req['_parsedUrl']['pathname'] != "/icon") {
    additional.showRequestInLogs(req, res);
  }
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

router.get('/icon', function (req, res) {
  if (typeof (req.query.server) !== "undefined") {
    if (fs.existsSync("./servers/" + req.query.server + "/server-icon.png")) {
      res.sendFile("servers/" + req.query.server + "/server-icon.png", {
        root: "./"
      });
    } else {
      var img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABMWlDQ1BBZG9iZSBSR0IgKDE5OTgpAAAoz62OsUrDUBRAz4ui4lArBHFweJMoKLbqYMakLUUQrNUhydakoUppEl5e1X6Eo1sHF3e/wMlRcFD8Av9AcergECGDgwie6dzD5XLBqNh1p2GUYRBr1W460vV8OfvEDFMA0Amz1G61DgDiJI74wecrAuB50647Df7GfJgqDUyA7W6UhSAqQP9CpxrEGDCDfqpB3AGmOmnXQDwApV7uL0ApyP0NKCnX80F8AGbP9Xww5gAzyH0FMHV0qQFqSTpSZ71TLauWZUm7mwSRPB5lOhpkcj8OE5UmqqOjLpD/B8BivthuOnKtall76/wzrufL3N6PEIBYeixaQThU598qjJ3f5+LGeBkOb2F6UrTdK7jZgIXroq1WobwF9+MvwMZP/U6/OGUAAAAJcEhZcwAACxMAAAsTAQCanBgAAAvkaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MiA3OS4xNjA5MjQsIDIwMTcvMDcvMTMtMDE6MDY6MzkgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjMtMDEtMTFUMTg6MjY6MjUrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIzLTAxLTE2VDE4OjA5OjIyKzAzOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIzLTAxLTE2VDE4OjA5OjIyKzAzOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9IkFkb2JlIFJHQiAoMTk5OCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6YzcxYWU1ZTctZWM4MC1iZTQ4LTkyOGUtODVhNmY3YjkzOTNjIiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6ODE1NTNhZjUtMWJiOC03ODRlLWI3ZWQtZDMzM2EzODg5ZmYxIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6OGRkYzA2YzUtZGJkNC1iZTQ3LWEwZTMtMDA3YzBmNjQ4ZGNjIiB0aWZmOk9yaWVudGF0aW9uPSIxIiB0aWZmOlhSZXNvbHV0aW9uPSI3MjAwMDAvMTAwMDAiIHRpZmY6WVJlc29sdXRpb249IjcyMDAwMC8xMDAwMCIgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMiIgZXhpZjpDb2xvclNwYWNlPSI2NTUzNSIgZXhpZjpQaXhlbFhEaW1lbnNpb249IjEwMjQiIGV4aWY6UGl4ZWxZRGltZW5zaW9uPSIxMDI0Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo4ZGRjMDZjNS1kYmQ0LWJlNDctYTBlMy0wMDdjMGY2NDhkY2MiIHN0RXZ0OndoZW49IjIwMjMtMDEtMTFUMTg6MjY6MjUrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGltYWdlL3BuZyB0byBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDphOWIzYzlhYi05OTJmLTFkNGEtYThjNC1lMmU4OTRhNGU3MDEiIHN0RXZ0OndoZW49IjIwMjMtMDEtMTFUMjA6MzY6NDIrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZmNhNWFhZTQtNWViYi05NTRhLTg4YzItZGQwN2NiNDNhZDQ1IiBzdEV2dDp3aGVuPSIyMDIzLTAxLTEyVDE2OjAyOjQyKzAzOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iZGVyaXZlZCIgc3RFdnQ6cGFyYW1ldGVycz0iY29udmVydGVkIGZyb20gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCB0byBpbWFnZS9wbmciLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjBlZjljMjJjLTdhN2YtZGY0Yi1iMjQ0LTZkOGVkZjFhNWY1ZSIgc3RFdnQ6d2hlbj0iMjAyMy0wMS0xMlQxNjowMjo0MiswMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNzFhZTVlNy1lYzgwLWJlNDgtOTI4ZS04NWE2ZjdiOTM5M2MiIHN0RXZ0OndoZW49IjIwMjMtMDEtMTZUMTg6MDk6MjIrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6ZmNhNWFhZTQtNWViYi05NTRhLTg4YzItZGQwN2NiNDNhZDQ1IiBzdFJlZjpkb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6MjJiMTdjZWUtMmIxNS03ODRmLWE2M2MtNWYzZDA5OWNmMmE1IiBzdFJlZjpvcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6OGRkYzA2YzUtZGJkNC1iZTQ3LWEwZTMtMDA3YzBmNjQ4ZGNjIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8++vjLNgAAD+FJREFUeNrNm0uMXNdxhr+qc+69/ZjueZIUReppy7JsB3Ycy4kdxMoDcSDb0cK7LLIOEMCbPBZeZBEYQRIkOy+8CJIgdoIsjDgIDMWJ7TiWLTp+SJQlkiLFh0iKHJLzfnRPT3ffe09lcXtmuufFmeFI4gEa6L7dPXPrrzpVf/11WsyMndbl8z/CJRGVoSppN4UQyLMcH0c478AgDwELAR9FGAbBQIS020UA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", 'base64');

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': img.length
      });
      res.end(img);
    }
  } else {
    res.send("");
  }
});

router.get('/completion', function (req, res) {
  fs.writeFileSync("./servers/" + req.query.server + "/eula.txt", "eula=true");
  newForgeInstalling = false;
  jfn = req.query.jf;
  if (jfn.match(/forge/gmi) != null) {
    version = jfn.match(/1\.\d+\.\d+/gmi);
    if (version != null) {
      version = version[0];
      version_index = version.split(".")[1];
      if (version_index > 16) {
        newForgeInstalling = true;
      }
    }
  }
  if (process.platform == "win32") {
    if (newForgeInstalling == true) {
      run_read = fs.readFileSync("./servers/" + req.query.server + "/run.bat").toString();
      run_read = run_read.split("\n");
      jl = null;
      run_read.forEach(function (line) {
        if (line.match(/java/gm) != null) {
          jl = line;
        }
      });
      if (jl != null) {
        args_path = jl.split("@")[2];
        args_path = args_path.replace("\r", "").trim();
        fs.writeFileSync("./servers/" + req.query.server + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + req.query.server + "\n" + Buffer.from(req.query.startcmd, 'base64').toString().replace("-jar", "").trim() + " @" + args_path + " nogui");
      }
    } else {
      fs.writeFileSync("./servers/" + req.query.server + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + req.query.server + "\n" + Buffer.from(req.query.startcmd, 'base64') + " " + req.query.jf + " nogui");
    }
  } else if (process.platform == "linux") {
    if (newForgeInstalling == true) {
      run_read = fs.readFileSync("./servers/" + req.query.server + "/run.sh").toString();
      run_read = run_read.split("\n");
      jl = null;
      run_read.forEach(function (line) {
        if (line.match(/java/gm) != null) {
          jl = line;
        }
      });
      if (jl != null) {
        args_path = jl.split("@")[2];
        args_path = args_path.replace("\r", "").trim();
        fs.writeFileSync("./servers/" + req.query.server + "/start.sh", "cd servers\ncd " + req.query.server + "\n" + Buffer.from(req.query.startcmd, 'base64').toString().replace("-jar", "").trim() + " @" + args_path + " nogui");
      }
    } else {
      fs.writeFileSync("./servers/" + req.query.server + "/start.sh", "cd servers\ncd " + req.query.server + "\n" + Buffer.from(req.query.startcmd, 'base64') + " " + req.query.jf + " nogui");
    }
  } else {
    console.log(colors.red(additional.getTimeFormatted() + " " + process.platform + " not supported"));
  }
  fs.writeFileSync("./servers/" + req.query.server + "/server.properties", "server-port=" + req.query.port + "\nquery.port=" + req.query.port + "\nenable-query=true\nonline-mode=" + req.query.onMode + "\nmotd=" + req.query.server);
  if (fs.existsSync("./servers/servers.json")) {
    cge = JSON.parse(fs.readFileSync("./servers/servers.json"));
  } else {
    cge = {};
  }
  servers_logs[req.query.server] = "";
  servers_instances[req.query.server] = "";
  sss = {
    status: "stopped",
    restartOnError: true,
    stopCommand: "stop",
    scheludedRestart: {
      enabled: false,
      crontab: "* * * * *"
    }
  };
  cge[req.query.server] = sss;
  serverjson_cfg = cge;
  config.writeServersJSON(cge);
  res.send("Success");
});

router.get('/statuses', function (req, res) {
  res.set('Content-Type', 'application/json');
  res.send(serverController.getStatuses());
});

router.get('/saveStopCommand', function (req, res) {
  serverjson_cfg[req.query.server]['stopCommand'] = req.query.cmd;
  config.writeServersJSON(serverjson_cfg);
  res.send("true");
});

router.get('/saveRestartScheduler', function (req, res) {
  serverjson_cfg = config.readServersJSON();
  rr = {
    enabled: req.query.enabled,
    crontab: req.query.crontab
  }
  serverjson_cfg[req.query.server]['restartScheduler'] = rr;
  config.writeServersJSON(serverjson_cfg);
  serverController.rescheduleAllServers();
  res.send("true");
});

router.get('/getStartScript', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    if (typeof (serverjson_cfg[req.query.server]) !== 'undefined') {
      res.send(serverController.getStartScript(req.query.server));
    } else {
      res.send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.get('/saveStartScript', (req, res) => {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    if (typeof (serverjson_cfg[req.query.server]) !== 'undefined') {
      res.send(serverController.saveStartScript(req.query.server, req.query.script, req.query.resonerr));
    } else {
      res.send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.get('/getServerPropertiesFile', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    if (typeof (serverjson_cfg[req.query.server]) !== 'undefined') {
      res.set('Content-Type', 'application/json');
      res.send(serverController.getServerProperties(req.query.server));
    } else {
      res.send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.get('/saveServerPropertiesFile', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    if (typeof (serverjson_cfg[req.query.server]) !== 'undefined') {
      res.send(serverController.saveServerProperties(req.query.server, req.query.doc));
    } else {
      res.send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.get('/log', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION_2)) {
    if (typeof (serverjson_cfg[req.query.server]) !== 'undefined') {
      spl = servers_logs[req.query.server].split(/\r?\n/).slice(-100);
      res.send(spl.join("\r\n"));
    } else {
      res.send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.get('/delete', function (req, res) {
  perms = auth_manager.getUserPermissions(req);
  if (perms.includes(ACCESS_PERMISSION)) {
    if (typeof (serverjson_cfg[req.query.server]) !== 'undefined') {
      delete serverjson_cfg[req.query.server];
      config.writeServersJSON(serverjson_cfg);
      setTimeout(function () {
        fs.rm("./servers/" + req.query.server, {
          recursive: true,
          force: true
        }, function () {
          res.send("true");
        });
      }, 500);
    } else {
      res.send("false");
    }
  } else {
    res.status(403).send();
  }
});

router.get('/start', function (req, res) {
  if (typeof (serverjson_cfg[req.query.server]) !== 'undefined' && serverjson_cfg[req.query.server].status == "stopped") {
    serverController.startServer(req.query.server);
    res.send("true");
  } else {
    res.send("false");
  }
});

router.get('/kill', function (req, res) {
  if (typeof (servers_instances[req.query.server]) == 'object') {
    treekill(servers_instances[req.query.server].pid, function () {
      //nothing
    });
    res.send("true");
  } else {
    res.send("false");
  }
});

router.get('/restart', function (req, res) {
  if (typeof (serverjson_cfg[req.query.server]) !== 'undefined' && serverjson_cfg[req.query.server].status == "started" && typeof restart_after_stop[req.query.server] == "undefined") {
    restart_after_stop[req.query.server] = true;
    command = "stop";
    command = Buffer.from(command, 'utf-8').toString();
    servers_logs[req.query.server] = servers_logs[req.query.server] + command + "\n";
    servers_instances[req.query.server].stdin.write(command + '\n');
    res.send("true");
  } else {
    res.send("false");
  }
});

router.get('/sendCommand', function (req, res) {
  if (typeof (serverjson_cfg[req.query.server]) !== 'undefined') {
    command = req.query.cmd;
    command = Buffer.from(command, 'utf-8').toString();
    servers_logs[req.query.server] = servers_logs[req.query.server] + command + "\n";
    servers_instances[req.query.server].stdin.write(command + '\n');
    res.send("true");
  } else {
    res.send("false");
  }
});

module.exports = router;