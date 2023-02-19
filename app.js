// My modules
const ftpd = require("./my_modules/ftpd");
const updater = require("./my_modules/updater");
const statsCollector = require("./my_modules/statistics");
const config = require("./my_modules/config");
const translator = require("./my_modules/translator");
const kubek = require("./my_modules/kubek");
const additional = require("./my_modules/additional");
const serverController = require("./my_modules/servers");
const auth_manager = require("./my_modules/auth_manager");

// Express initialization
const express = require('express');
const app = express();
const port = 3000;
const updatesInterval = 3600000; // 5 hours
const fileUpload = require('express-fileupload');
const cookieParser = require("cookie-parser");

// Routers
var auth_router = require("./routers/auth");
var server_router = require("./routers/server");
var kubek_router = require("./routers/kubek");
var plugins_router = require("./routers/plugins");
var cores_router = require("./routers/cores");
var tasks_router = require("./routers/tasks");
var downloader_router = require("./routers/downloader");
var upload_router = require("./routers/upload");
var fmapi_router = require("./routers/fmapi");
var forgeInstaller_router = require("./routers/forgeInstaller");

// Other modules init
var mime = require('mime');
const path = require('path');
const fs = require('fs');
var colors = require('colors');

// Rate limiter init
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 5000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
})
const authLimiter2 = rateLimit({
  windowMs: 2000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
})
const authLimiter3 = rateLimit({
  windowMs: 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
})

// Config loading
var cfg = config.readConfig();

// Socket.io initialization
var socket_options;
if (cfg['internet-access'] == true) {
  origin = "*";
} else {
  origin = "http://localhost:3000";
}
socket_options = {
  cors: {
    origin: origin
  }
};
global.io = require("socket.io")(112, socket_options);

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
  socket.on("startFileWrite", (arg) => { // Start file upload after edit (FM)
    currentFileWritings[arg.randCode] = "./servers/" + arg.path;
    currentFileWritingsText[arg.randCode] = "";
  });
  socket.on("addFileWrite", (arg) => { // Add fragment to file upload (FM)
    if (typeof currentFileWritingsText[arg.randCode] !== "undefined") {
      if (currentFileWritingsText[arg.randCode] == "") {
        currentFileWritingsText[arg.randCode] = arg.add;
      } else {
        currentFileWritingsText[arg.randCode] = currentFileWritingsText[arg.randCode] + "\n" + arg.add;
      }

    }
  });
  socket.on("finishFileWrite", (arg) => { // Finish write to file (FM)
    if (typeof currentFileWritingsText[arg.randCode] !== "undefined") {
      fs.writeFileSync(currentFileWritings[arg.randCode], currentFileWritingsText[arg.randCode]);
      delete currentFileWritings[arg.randCode];
      delete currentFileWritingsText[arg.randCode];
    }
  });
});

// Custom vars initialization
global.cp = {};
global.serDeletes = {};
global.servers_logs = [];
global.servers_instances = [];
global.updatesByIntArray = {};
global.forgesIns = [];
global.currentFileWritings = [];
global.currentFileWritingsText = [];
global.ftpserver;

// Kubek version
global.kubek_version = "v2.0.2";

app.use(fileUpload());
app.use(cookieParser());
app.use('/auth/login', authLimiter);
app.use('/upload', authLimiter2);
app.use('/server/completion', authLimiter2);
app.use('/kubek/saveConfig', authLimiter2);
app.use('/plugins', authLimiter3);
app.use('/downloader/download', authLimiter3);

global.configjson = config.readServersJSON();
for (var i in configjson) {
  configjson[i]['status'] = 'stopped';
}
if (fs.existsSync("./servers/servers.json")) {
  fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
}

if (typeof (configjson) !== "undefined") {
  for (t in configjson) {
    servers_logs[t] = "";
    servers_instances[t] = "";
  }
}

statsCollector.collectStats(cfg, kubek_version, function (stats) {
  statsCollector.sendStats(stats);
});

console.log(colors.inverse('Kubek ' + kubek_version + ''));
console.log(colors.inverse('https://github.com/Seeroy/kubek-minecraft-dashboard'));
console.log(" ");

updater.getFTPD(function () {
  if (cfg.ftpd == true) {
    if (process.platform == "linux") {
      console.log("Currently FTP cannot be used on Linux");
    } else {
      ftpserver = ftpd.startFTPD();
    }
  }
});

updater.checkForUpdates(function (upd) {
  if (upd != 0 && kubek_version != upd) {
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
      authsucc = auth_manager.authorize(req.cookies["kbk__hash"], req.cookies["kbk__login"]);
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
          additional.showRequestInLogs(req, res);
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
    console.log(additional.getTimeFormatted(), "Webserver listening on", link);
  });
  console.log(additional.getTimeFormatted(), "Socket.io listening on", 112);
});

updater.setCheckingForUpdatesByInterval(updatesInterval);
app.use("/auth", auth_router);
app.use("/server", server_router);
app.use("/kubek", kubek_router);
app.use("/plugins", plugins_router);
app.use("/tasks", tasks_router);
app.use("/downloader", downloader_router);
app.use("/cores", cores_router);
app.use("/fmapi", fmapi_router);
app.use("/upload", upload_router);
app.use("/forgeInstaller", forgeInstaller_router);