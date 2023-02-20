var express = require('express');
var router = express.Router();
var fs = require('fs');
var additional = require('./../my_modules/additional');
var request = require('request');
var config = require("./../my_modules/config");
const auth_manager = require("./../my_modules/auth_manager");
const translator = require('./../my_modules/translator');

router.use(function (req, res, next) {
  additional.showRequestInLogs(req, res);
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

router.get('/download', function (req, res) {
  cp[req.query.filename] = 0;
  if (!fs.existsSync("./servers")) {
    fs.mkdirSync("./servers");
  }
  if (!fs.existsSync("./servers/" + req.query.server)) {
    fs.mkdirSync("./servers/" + req.query.server);
  }
  if (!fs.existsSync("./servers/" + req.query.server + "/plugins")) {
    fs.mkdirSync("./servers/" + req.query.server + "/plugins");
  }
  console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-downstarted}}", cfg['lang']) + ": ", req.query.filename, "server: " + req.query.server);
  if (req.query.type != "plugin") {
    startDownloadByURL(req.query.url, "./servers/" + req.query.server + "/" + req.query.filename, req.query.filename);
  } else {
    startDownloadByURL(req.query.url, "./servers/" + req.query.server + "/plugins/" + req.query.filename, req.query.filename);
  }
  fsock = io.sockets.sockets;
  for (const socket of fsock) {
    socket[1].emit("handleUpdate", {
      type: "downloadTasks",
      data: cp
    });
  }
  res.send("Success");
});

module.exports = router;

function startDownloadByURL(url, filename, ffn) {
  var received_bytes = 0;
  var total_bytes = 0;

  var outStream = fs.createWriteStream(filename);

  request
    .get(url)
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
      console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-downcompleted}}", cfg['lang']) + ": " + ffn);
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "downloadTasks",
          data: cp
        });
      }
    })
    .pipe(outStream);
}

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