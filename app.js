// My modules
const ftpd = require("./my_modules/ftpd");
const updater = require("./my_modules/updater");
const statsCollector = require("./my_modules/statistics");
const config = require("./my_modules/config");
const translator = require("./my_modules/translator");
const serverController = require("./my_modules/servers");
const plugins = require("./my_modules/plugins");
const additional = require("./my_modules/additional");
const cores = require("./my_modules/cores");
const kubek = require("./my_modules/kubek");

const express = require('express');
const app = express();
const port = 3000;
const updatesInterval = 18000000; // 5 hours
const fileUpload = require('express-fileupload');
const cookieParser = require("cookie-parser");

var mime = require('mime');
const path = require('path');
var crypto = require('crypto');
var spParser = require("minecraft-server-properties");
const fs = require('fs');
var colors = require('colors');
const spawn = require("cross-spawn");
var iconvlite = require('iconv-lite');
var ip_local = require("ip");
const ip_public = require('external-ip')();

var cfg = config.readConfig();

var socket_options;
if (cfg['internet-access'] == true) {
  socket_options = {
    cors: {
      origin: "*"
    }
  };
} else {
  socket_options = {
    cors: {
      origin: "http://localhost:3000"
    }
  };
}
const io = require("socket.io")(112, socket_options);

const request = require('request');

var cp = {};
var serDeletes = {};
var servers_logs = [];
var servers_instances = [];
var updatesByIntArray = {};

const {
  response
} = require('express');

// Kubek version
const version = "v1.2.3";

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 5000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
})

var ftpserver;
io.on("connection", (socket) => {
  socket.emit("handshake", socket.id);
  socket.on("update", (arg) => {
    switch (arg.type) {
      case "usage":
        kubek.getUsage(function (usage) {
          socket.emit("handleUpdate", {
            type: "usage",
            data: usage
          });
        });
        break;
      case "servers":
        socket.emit("handleUpdate", {
          type: "servers",
          data: serverController.getStatuses()
        });
        break;
      case "query":
        serverController.queryServer(arg.server, function (data) {
          socket.emit("handleUpdate", {
            type: "query",
            data: data
          });
        });
        break;
      case "console":
        serverController.queryServer(arg.server, function (data) {
          socket.emit("handleUpdate", {
            type: "console",
            data: {
              server: arg.server,
              data: servers_logs[arg.server]
            }
          });
        });
        break;
    }
  });

});

app.use(fileUpload());
app.use(cookieParser());
app.use('/auth/login', authLimiter);

var configjson = config.readServersJSON();
for (var i in configjson) {
  configjson[i]['status'] = 'stopped';
}
if (fs.existsSync("./servers/servers.json")) {
  fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
}

if (cfg.ftpd == true) {
  if (process.platform == "linux") {
    console.log("Currently FTP cannot be used on Linux, sorry");
  } else {
    ftpserver = ftpd.startFTPD();
  }
}

if (typeof (configjson) !== "undefined") {
  for (t in configjson) {
    servers_logs[t] = "";
    servers_instances[t] = "";
  }
}

statsCollector.collectStats(cfg, version, function (stats) {
  statsCollector.sendStats(stats);
});

function isAuth(hash) {
  var authsucc = false;
  cfg = config.readConfig();
  if (cfg.auth == false) {
    authsucc = true;
  } else {
    if (typeof (hash) !== "undefined" && hash != "" && hash == crypto.createHash('md5').update(cfg["owner-password"]).digest('hex')) {
      authsucc = true;
    }
  }
  return authsucc;
}

console.log(colors.inverse('Kubek ' + version + ''));
console.log(colors.inverse('https://github.com/Seeroy/kubek-minecraft-dashboard'));
console.log(" ");

updater.getFTPD();

updater.checkForUpdates(function (upd) {
  if (upd != 0 && version != upd) {
    console.log(additional.getTimeFormatted(), colors.yellow('Updates found! URL:'));
    console.log(additional.getTimeFormatted(), colors.yellow("https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" + upd));
    updatesByIntArray = {
      found: true,
      url: "https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" + upd
    };
  } else {
    console.log(additional.getTimeFormatted(), colors.green('Updates not found'));
    updatesByIntArray = {
      found: false
    };
  }

  app.use(function (req, res, next) {
    var authsucc = false;
    cfg = config.readConfig();
    if (req["_parsedUrl"].pathname == "/login.html") {
      authsucc = true;
    } else {
      authsucc = isAuth(req.cookies["__auth__"]);
    }
    if (authsucc == true || path.extname(req["_parsedUrl"].pathname) == ".js" || path.extname(req["_parsedUrl"].pathname) == ".png" || path.extname(req["_parsedUrl"].pathname) == ".css" || path.extname(req["_parsedUrl"].pathname) == ".svg") {
      if (req["_parsedUrl"].pathname == "/") {
        req["_parsedUrl"].pathname = "/index.html";
      }
      if (fs.existsSync(path.join(__dirname, "./www/" + req["_parsedUrl"].pathname)) && path.extname(req["_parsedUrl"].pathname) != "") {
        file = fs.readFileSync(path.join(__dirname, "./www/" + req["_parsedUrl"].pathname));
        cfg = config.readConfig();
        res.set('content-type', mime.getType(path.join(__dirname, "./www/" + req["_parsedUrl"].pathname)));
        if (path.extname(req["_parsedUrl"].pathname) != ".js" && path.extname(req["_parsedUrl"].pathname) != ".png" && path.extname(req["_parsedUrl"].pathname) != ".css") {
          showRequestInLogs(req);
        }
        ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
        if (cfg['internet-access'] == false && ip != "127.0.0.1") {
          res.send("Cannot be accessed from the internet");
        } else {
          res.send(translator.translateHTML(file, cfg.lang));
        }
      }
    } else {
      res.redirect("/login.html");
    }
    next();
  });
  app.listen(port, () => {
    link = 'http://localhost:' + port;
    console.log(additional.getTimeFormatted(), "Kubek listening on", link);
  });
  console.log(additional.getTimeFormatted(), "Socket.io listening on", 112);
});

setInterval(function () {
  console.log(additional.getTimeFormatted(), "Checking for Kubek updates...");
  updater.checkForUpdates(function (upd) {
    if (upd != 0 && version != upd) {
      console.log(additional.getTimeFormatted(), colors.yellow('Updates found! URL:'));
      console.log(additional.getTimeFormatted(), colors.yellow("https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" + upd));
      updatesByIntArray = {
        found: true,
        url: "https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" + upd
      };
    } else {
      console.log(additional.getTimeFormatted(), colors.green('Updates not found'));
      updatesByIntArray = {
        found: false
      };
    }
  });
}, updatesInterval);

function showRequestInLogs(req) {
  method = req.method.toString().toUpperCase();
  ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  url = req.originalUrl;
  console.log(additional.getTimeFormatted(), "[" + colors.yellow(ip) + "]", method, colors.green(url));
  if(cfg['save-logs'] == true){
    if(!fs.existsSync("./logs/")){
      fs.mkdirSync("./logs");
    }
    date = new Date();
    fname = date.getDate().toString().padStart(2, "0") + "-" + date.getMonth().toString().padStart(2, "0") + "-" + date.getFullYear().toString().padStart(2, "0") + ".log";
    if(fs.existsSync("./logs/" + fname)){
      rf = fs.readFileSync("./logs/" + fname);
      rf = rf + "\n" + additional.getTimeFormatted() + " [" + ip + "] " + method + " " + url;
    } else {
      rf = additional.getTimeFormatted() + " [" + ip + "] " + method + " " + url;
    }
    fs.writeFileSync("./logs/" + fname, rf);
  }
}

app.get("/auth/login", (request, response) => {
  cfg = config.readConfig();
  if (request.query.password == cfg["owner-password"] && request.query.login == cfg["owner-user"]) {
    let options = {
      maxAge: 120 * 24 * 60 * 60 * 1000,
      httpOnly: true
    }
    response.cookie("__auth__", crypto.createHash('md5').update(cfg["owner-password"]).digest('hex'), options);
    response.redirect("/");
  } else {
    response.send("Wrong credetinals!");
  }
});

app.get("/server/icon", function (req, res) {
  ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof req.cookies !== "undefined" && typeof req.cookies["__auth__"] !== "undefined" && !isAuth(req.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (req.query.server) !== "undefined") {
        if (fs.existsSync("./servers/" + req.query.server + "/server-icon.png")) {
          res.sendFile("servers/" + req.query.server + "/server-icon.png", {
            root: "./"
          });
        } else {
          var img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEgAAABhCAYAAAB1Tue5AAABN2lDQ1BBZG9iZSBSR0IgKDE5OTgpAAAokZWPv0rDUBSHvxtFxaFWCOLgcCdRUGzVwYxJW4ogWKtDkq1JQ5ViEm6uf/oQjm4dXNx9AidHwUHxCXwDxamDQ4QMBYvf9J3fORzOAaNi152GUYbzWKt205Gu58vZF2aYAoBOmKV2q3UAECdxxBjf7wiA10277jTG+38yH6ZKAyNguxtlIYgK0L/SqQYxBMygn2oQD4CpTto1EE9AqZf7G1AKcv8ASsr1fBBfgNlzPR+MOcAMcl8BTB1da4Bakg7UWe9Uy6plWdLuJkEkjweZjs4zuR+HiUoT1dFRF8jvA2AxH2w3HblWtay99X/+PRHX82Vun0cIQCw9F1lBeKEuf1UYO5PrYsdwGQ7vYXpUZLs3cLcBC7dFtlqF8hY8Dn8AwMZP/fNTP8gAAAAJcEhZcwAACxMAAAsTAQCanBgAAAa9aVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0OCA3OS4xNjQwMzYsIDIwMTkvMDgvMTMtMDE6MDY6NTcgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyMS4wIChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjEtMTEtMjZUMTU6MjQ6NDQrMDM6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjEtMTEtMjdUMTY6MjA6MTIrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIxLTExLTI3VDE2OjIwOjEyKzAzOjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjYzOWQ3ZDkzLTM3MGUtNWE0YS1iNmE3LWE0ZTE0ZTcyMDg2NiIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmQ1OWZmZmIyLWJmYjYtNzQ0NC05NTQxLTQ2ZmMwYmU2OTdkMyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmM4Y2MxNjZiLTliNTktN2M0OC05OGY1LWFjZjM1ZjViZmY2ZSIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJBZG9iZSBSR0IgKDE5OTgpIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOGNjMTY2Yi05YjU5LTdjNDgtOThmNS1hY2YzNWY1YmZmNmUiIHN0RXZ0OndoZW49IjIwMjEtMTEtMjZUMTU6MjQ6NDQrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4wIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NTQyMWI0ZWItYmEzYS0zMTQyLThiMWMtMTQzMjliZGNkZTc1IiBzdEV2dDp3aGVuPSIyMDIxLTExLTI2VDE1OjI0OjQ0KzAzOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjEuMCAoV2luZG93cykiIHN0RXZ0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", 'base64');

          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
          });
          res.end(img);
        }
      } else {
        res.send("");
      }
    }
  }
});

app.get('/plugin/search', function (request, response) {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.set('Content-Type', 'application/json');
      plugins.searchPlugin(request.query.search, function (plugins) {
        response.send(JSON.stringify(plugins));
      });
    }
  }
});

app.get('/plugin/page', function (request, response) {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.set('Content-Type', 'application/json');
      plugins.getBukkitPage(request.query.pg, function (plugins) {
        response.send(JSON.stringify(plugins));
      });
    }
  }
});

app.get('/server/completion', (req, res) => {
  ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof req.cookies !== "undefined" && typeof req.cookies["__auth__"] !== "undefined" && !isAuth(req.cookies["__auth__"])) {
      res.redirect("/login.html");
    } else {
      showRequestInLogs(req);

      fs.writeFileSync("./servers/" + req.query.server + "/eula.txt", "eula=true");
      if (process.platform == "win32") {
        fs.writeFileSync("./servers/" + req.query.server + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + req.query.server + "\n" + Buffer.from(req.query.startcmd, 'base64') + " " + req.query.jf + " nogui");
      } else if (process.platform == "linux") {
        fs.writeFileSync("./servers/" + req.query.server + "/start.sh", "cd servers\ncd " + req.query.server + "\n" + Buffer.from(req.query.startcmd, 'base64') + " " + req.query.jf + " nogui");
      } else {
        console.log(colors.red(getTimeFormatted() + " " + process.platform + " not supported"));
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
        status: "stopped"
      };
      cge[req.query.server] = sss;
      res.send("Success");
      configjson = cge;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(cge));
    }
  }
});

app.get("/kubek/javaVersions", (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      response.set('Content-Type', 'application/json');
      if (process.platform == "win32") {
        directories = ["C:/Program Files", "C:/Program Files(x86)", "C:/Program Files (x86)"]
        tree = ["Java", "JDK", "OpenJDK", "OpenJRE", "Adoptium", "JRE", "AdoptiumJRE", "Temurin"];
        javas = [];
        directories.forEach(function (mainDir) {
          tree.forEach(function (inner) {
            directory = mainDir + "/" + inner;
            if (fs.existsSync(directory)) {
              fs.readdirSync(directory).forEach(function (jvs) {
                if (fs.existsSync(directory + "/" + jvs + "/bin/java.exe")) {
                  javas.push(directory + "/" + jvs + "/bin/java.exe");
                }
              });
            }
          });
        });
      } else {
        javas = ["java"];
      }
      response.send(javas);
    }
  }
});

app.get('/server/deletes', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      response.set('Content-Type', 'application/json');
      response.send(JSON.stringify(serDeletes));
    }
  }
});

app.get("/server/ips", (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        loc_ip = ip_local.address();
        data = fs.readFileSync("./servers/" + request.query.server + "/server.properties");
        data = spParser.parse(data.toString());
        ip_public((err, pub_ip) => {
          pub_ip = pub_ip + ":" + data["server-port"];
          let jsn = {
            local: loc_ip,
            public: pub_ip
          };
          response.send(jsn);
        });
      } else {
        response.send("false");
      }
    }
  }
});

app.get("/server/delete", (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        delete configjson[request.query.server];
        fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
        setTimeout(function () {
          fs.rm("./servers/" + request.query.server, {
            recursive: true,
            force: true
          }, function () {
            response.send("true");
          });
        }, 500);
      } else {
        response.send("false");
      }
    }
  }
});

app.get('/plugin/versions', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.set('Content-Type', 'application/json');
      plugins.getPluginVersions(request.query.url, function (plugins) {
        response.send(JSON.stringify(plugins));
      });
    }
  }
});

app.get('/plugin/installed', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (fs.existsSync("./servers/" + request.query.server + "/plugins")) {
        response.send(plugins.getInstalledPlugins(request.query.server));
      } else {
        tr = [];
        response.set("content-type", "application/json");
        tt = JSON.stringify(tr);
        response.send(tt);
      }
    }
  }
});

app.get('/plugin/delete', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      plugins.deleteInstalledPlugin(request.query.server, request.query.file);
      response.send("Success");
    }
  }
});

app.get('/server/statuses', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      response.set('Content-Type', 'application/json');
      response.send(serverController.getStatuses());
    }
  }
});

app.get('/server/startScript/get', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.send(serverController.getStartScript(request.query.server));
      } else {
        response.send("false");
      }
    }
  }
});

app.get('/server/startScript/save', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.send(serverController.saveStartScript(request.query.server, request.query.script));
      } else {
        response.send("false");
      }
    }
  }
});

app.get('/server/properties/get', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.set('Content-Type', 'application/json');
        response.send(serverController.getServerProperties(request.query.server));
      } else {
        response.send("false");
      }
    }
  }
});

app.get("/server/properties/save", function (request, response) {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.send(serverController.saveServerProperties(request.query.server, request.query.doc));
      } else {
        response.send("false");
      }
    }
  }
});

app.get('/server/start', function (request, response) {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (typeof (configjson[request.query.server]) !== 'undefined' && configjson[request.query.server].status == "stopped") {
        startServer(request.query.server);
        response.send("true");
      } else {
        response.send("false");
      }
    }
  }
});

app.get("/server/log", function (request, response) {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.send(servers_logs[request.query.server]);
      } else {
        response.send("false");
      }
    }
  }
});

app.get('/server/sendCommand', function (request, response) {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        command = request.query.cmd;
        command = Buffer.from(command, 'utf-8').toString();
        servers_logs[request.query.server] = servers_logs[request.query.server] + command + "\n";
        servers_instances[request.query.server].stdin.write(command + '\n');
        response.send("true");
      } else {
        response.send("false");
      }
    }
  }
});

app.get('/server/query', function (request, response) {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (configjson[request.query.server]) !== 'undefined' && configjson[request.query.server].status != "stopped") {
        serverController.queryServer(request.query.server, function (data) {
          response.send(JSON.stringify(data));
        });
      } else {
        response.send("false");
      }
    }
  }
});

function startServer(server) {
  servers_logs[server] = "";
  if (process.platform == "win32") {
    startFile = path.resolve("./servers/" + server + "/start.bat");
    if (fs.existsSync(startFile)) {
      servers_instances[server] = spawn('"servers/' + server + '/start.bat"');
      start = true;
    } else {
      console.log(colors.red(additional.getTimeFormatted() + " " + '"servers/' + server + '/start.bat"' + " not found! Try to delete, and create new server!"));
      start = false;
    }
  } else if (process.platform == "linux") {
    startFile = path.resolve("./servers/" + server + "/start.sh");
    if (fs.existsSync(startFile)) {
      servers_instances[server] = spawn('sh', ["./servers/" + server + "/start.sh"]);
      start = true;
    } else {
      console.log(colors.red(additional.getTimeFormatted() + " " + '"servers/' + server + '/start.sh"' + " not found! Try to delete, and create new server!"));
      start = false;
    }
  } else {
    console.log(colors.red(additional.getTimeFormatted() + " " + process.platform + " not supported"));
    start = false;
  }

  if (start == true) {
    configjson = JSON.parse(fs.readFileSync("./servers/servers.json"));
    console.log(additional.getTimeFormatted(), "STARTING SERVER:", server.green);
    statuss = "starting";
    servers_instances[server].on('close', (code) => {
      statuss = "stopped";
      configjson[server].status = statuss;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "servers",
          data: serverController.getStatuses()
        });
      }
      if (code != 0) {
        servers_logs[server] = servers_logs[server] + "ERROR: Process finished with exit code " + code;
        console.log(additional.getTimeFormatted(), "STOPPED SERVER WITH CODE " + code + ":", server.red);
      } else {
        console.log(additional.getTimeFormatted(), "STOPPED SERVER:", server.green);
      }
    });
    servers_instances[server].stdout.on('data', (data) => {
      data = iconvlite.decode(data, "win1251");
      servers_logs[server] = servers_logs[server] + data.toString();
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "console",
          data: {
            server: server,
            data: servers_logs[server]
          }
        });
      }
      if (data.indexOf("Loading libraries, please wait...") >= 0) {
        statuss = "starting";
      }
      if (data.indexOf("Done") >= 0) {
        statuss = "started";
        console.log(additional.getTimeFormatted(), "STARTED SERVER:", server.green);
      }
      if (data.indexOf("Saving players") >= 0) {
        console.log(additional.getTimeFormatted(), "STOPPING SERVER:", server.green);
        statuss = "stopping";
      }
      configjson[server].status = statuss;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "servers",
          data: serverController.getStatuses()
        });
      }
    });
    servers_instances[server].stderr.on('data', (data) => {
      data = iconvlite.decode(data, "win1251");
      servers_logs[server] = servers_logs[server] + "ERROR: " + data.toString();
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "console",
          data: {
            server: server,
            data: servers_logs[server]
          }
        });
      }
      configjson[server].status = statuss;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "servers",
          data: serverController.getStatuses()
        });
      }
    });
    fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "servers",
        data: serverController.getStatuses()
      });
    }
  }
}

function getInstallerFile(installerfileURL, installerfilename, ffn) {
  var received_bytes = 0;
  var total_bytes = 0;

  var outStream = fs.createWriteStream(installerfilename);

  request
    .get(installerfileURL)
    .on('error', function (err) {
      console.log(err);
    })
    .on('response', function (data) {
      total_bytes = parseInt(data.headers['content-length']);
    })
    .on('data', function (chunk) {
      received_bytes += chunk.length;
      showDownloadingProgress(received_bytes, total_bytes, ffn);
    })
    .on('end', function () {
      delete cp[ffn];
      console.log(additional.getTimeFormatted(), "Download complete: " + ffn);
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "downloadTasks",
          data: cp
        });
      }
    })
    .pipe(outStream);
};

function showDownloadingProgress(received, total, fn) {
  var percentage = ((received * 100) / total).toFixed(2);
  cp[fn] = Math.round(percentage);
  fsock = io.sockets.sockets;
  for (const socket of fsock) {
    socket[1].emit("handleUpdate", {
      type: "downloadTasks",
      data: cp
    });
  }
}

app.get('/core/paper/search', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      cores.getCoreURL(request.query.core, function (url) {
        response.send(url);
      });
    }
  }
});

app.get('/core/spigot/search', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      cv = request.query.core.split(" ")[1];
      cores.getSpigotCores(function (cores) {
        response.send(cores[cv]);
      });
    }
  }
});

app.get("/core/list", (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.set('Content-Type', 'application/json');
      possbileCores = ['Spigot', 'Paper', 'Forge'];
      paperVers = [];
      spigotVers = [];
      forgeVers = [];
      cores.getPaperCores(function (cores_p) {
        cores_p = cores_p.reverse();
        cores_p.forEach(function (core) {
          paperVers.push(core.split(" ")[1]);
        });
        cores.getSpigotCores(function (cores_s) {
          Object.keys(cores_s).forEach(function (key, index) {
            spigotVers.push(key);
          }, cores_s);
          let jsn = {
            possible: possbileCores,
            paper: paperVers,
            spigot: spigotVers,
            forge: forgeVers
          }
          response.send(jsn);
        });
      });
    }
  }
});

app.get('/core/spigot/list', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.set('Content-Type', 'application/json');
      cores.getSpigotCores(function (cores) {
        response.send(cores);
      });
    }
  }
});

app.get('/server/list', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.send(serverController.listServers());
    }
  }
});

app.get('/file/download', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      cp[request.query.filename] = 0;
      if (!fs.existsSync("./servers")) {
        fs.mkdirSync("./servers");
      }
      if (!fs.existsSync("./servers/" + request.query.server)) {
        fs.mkdirSync("./servers/" + request.query.server);
      }
      if (!fs.existsSync("./servers/" + request.query.server + "/plugins")) {
        fs.mkdirSync("./servers/" + request.query.server + "/plugins");
      }
      console.log(additional.getTimeFormatted(), "Download started:", request.query.filename, "server: " + request.query.server);
      if (request.query.type != "plugin") {
        getInstallerFile(request.query.url, "./servers/" + request.query.server + "/" + request.query.filename, request.query.filename);
      } else {
        getInstallerFile(request.query.url, "./servers/" + request.query.server + "/plugins/" + request.query.filename, request.query.filename);
      }
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "downloadTasks",
          data: cp
        });
      }
      response.send("Success");
    }
  }
});

app.get('/tasks/progress', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      response.set('Content-Type', 'application/json');
      response.send(JSON.stringify(cp));
    }
  }
});

app.get('/kubek/version', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.send(version);
    }
  }
});

app.get('/kubek/updates', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      showRequestInLogs(request);
      response.send(updatesByIntArray);
    }
  }
});

app.get('/kubek/usage', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      kubek.getUsage(function (usage) {
        response.send(usage);
      });
    }
  }
});

app.get("/kubek/config", (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      response.send(config.readConfig());
    }
  }
});

app.get("/kubek/saveConfig", (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      fs.writeFileSync("./config.json", request.query.data);
      response.send("true");
    }
  }
});

app.post('/icon/upload', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      let sampleFile;
      let uploadPath;

      if (!request.files || Object.keys(request.files).length === 0) {
        return response.status(400).send('No files were uploaded.');
      }

      sampleFile = request.files['g-img-input'];
      uploadPath = __dirname + "/servers/" + request.query["server"] + "/server-icon.png";

      if (path.extname(sampleFile.name) == ".png") {
        sampleFile.mv(uploadPath, function (err) {
          if (err)
            return response.status(400).send(err);

          response.send("uploaded");
        });
      } else {
        return response.status(400).send("false");
      }
    }
  }
});

app.post('/core/upload', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (!fs.existsSync("./servers")) {
        fs.mkdirSync("./servers");
      }
      fs.mkdirSync("./servers/" + request.query["server"]);
      let sampleFile;
      let uploadPath;

      if (!request.files || Object.keys(request.files).length === 0) {
        return response.status(400).send('No files were uploaded.');
      }

      sampleFile = request.files['g-core-input'];
      uploadPath = __dirname + "/servers/" + request.query["server"] + "/" + sampleFile.name;

      if (path.extname(sampleFile.name) == ".jar") {
        sampleFile.mv(uploadPath, function (err) {
          if (err)
            return response.status(400).send(err);

          response.send("uploaded");
        });
      } else {
        return response.status(400).send("false");
      }
    }
  }
});

app.post('/plugin/upload', (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (!fs.existsSync("./servers/" + request.query["server"] + "/plugins")) {
        fs.mkdirSync("./servers/" + request.query["server"] + "/plugins");
      }
      let sampleFile;
      let uploadPath;

      if (!request.files || Object.keys(request.files).length === 0) {
        return response.status(400).send('No files were uploaded.');
      }

      sampleFile = request.files['g-plugin-input'];
      uploadPath = __dirname + "/servers/" + request.query["server"] + "/plugins/" + sampleFile.name;

      if (path.extname(sampleFile.name) == ".jar") {
        sampleFile.mv(uploadPath, function (err) {
          if (err)
            return response.status(400).send(err);

          response.send("uploaded");
        });
      } else {
        return response.status(400).send("false");
      }
    }
  }
});

app.get("/ftpd/set", (request, response) => {
  ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg['internet-access'] == false && ip != "127.0.0.1") {
    response.send("Cannot be accessed from the internet");
  } else {
    if (typeof request.cookies !== "undefined" && typeof request.cookies["__auth__"] !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      ftpd.stopFTPD();
      setTimeout(function () {
        if (request.query.value == "true") {
          if (process.platform == "linux") {
            console.log("Currently FTP cannot be used on Linux, sorry");
            cfg = fs.readFileSync("./config.json");
            cfg = JSON.parse(cfg);
            cfg.ftpd = false;
          } else {
            ftpserver = ftpd.startFTPD();
            cfg = fs.readFileSync("./config.json");
            cfg = JSON.parse(cfg);
            cfg.ftpd = true;
          }
          fs.writeFileSync("./config.json", JSON.stringify(cfg));
        } else {
          ftpd.stopFTPD();
          cfg = fs.readFileSync("./config.json");
          cfg = JSON.parse(cfg);
          cfg.ftpd = false;
          fs.writeFileSync("./config.json", JSON.stringify(cfg));
        }
        response.send("true");
      }, 500);
    }
  }
});