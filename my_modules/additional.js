var colors = require('colors');
var fs = require('fs');
var configManager = require("./config");
var cfg = configManager.readConfig();

exports.getTimeFormatted = () => {
  date = new Date();
  return "[" + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0") + ":" + date.getSeconds().toString().padStart(2, "0") + "." + date.getMilliseconds().toString().padStart(2, "0") + "]";
}

exports.showRequestInLogs = (req, res) => {
  method = req.method.toString().toUpperCase();
  ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  url = req.originalUrl;
  console.log(this.getTimeFormatted(), "[" + colors.yellow(ip) + "]", colors.green(req.method) + " - " + colors.cyan(res.statusCode) + " - " + url);
  if (cfg['save-logs'] == true) {
    if (!fs.existsSync("./logs/")) {
      fs.mkdirSync("./logs");
    }
    date = new Date();
    fname = date.getDate().toString().padStart(2, "0") + "-" + date.getMonth().toString().padStart(2, "0") + "-" + date.getFullYear().toString().padStart(2, "0") + ".log";
    if (fs.existsSync("./logs/" + fname)) {
      rf = fs.readFileSync("./logs/" + fname);
      rf = rf + "\n" + this.getTimeFormatted() + " [" + ip + "] " + req.method + " - " + res.statusCode + " - " + url;
    } else {
      rf = this.getTimeFormatted() + " [" + ip + "] " + req.method + " - " + res.statusCode + " - " + url;
    }
    fs.writeFileSync("./logs/" + fname, rf);
  }
}

exports.showMyMessageInLogs = (req, res, msg) => {
  method = req.method.toString().toUpperCase();
  ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  url = req.originalUrl;
  console.log(this.getTimeFormatted(), "[" + colors.yellow(ip) + "]", msg);
  if (cfg['save-logs'] == true) {
    if (!fs.existsSync("./logs/")) {
      fs.mkdirSync("./logs");
    }
    date = new Date();
    fname = date.getDate().toString().padStart(2, "0") + "-" + date.getMonth().toString().padStart(2, "0") + "-" + date.getFullYear().toString().padStart(2, "0") + ".log";
    if (fs.existsSync("./logs/" + fname)) {
      rf = fs.readFileSync("./logs/" + fname);
      rf = rf + "\n" + this.getTimeFormatted() + " [" + ip + "] " + msg;
    } else {
      rf = this.getTimeFormatted() + " [" + ip + "] " + msg;
    }
    fs.writeFileSync("./logs/" + fname, rf);
  }
}

exports.uuidv4 = () => {
  var d = new Date().getTime();
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}