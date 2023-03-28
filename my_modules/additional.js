var colors = require('colors');
var fs = require('fs');
var config = require("./config");
var cfg = config.readConfig();

exports.kubekLogo = " /$$                 /$$                 /$$      \n| $$                | $$                | $$      \n| $$   /$$ /$$   /$$| $$$$$$$   /$$$$$$ | $$   /$$\n| $$  /$$/| $$  | $$| $$__  $$ /$$__  $$| $$  /$$/\n| $$$$$$/ | $$  | $$| $$  \ $$| $$$$$$$$| $$$$$$/ \n| $$_  $$ | $$  | $$| $$  | $$| $$_____/| $$_  $$ \n| $$ \  $$|  $$$$$$/| $$$$$$$/|  $$$$$$$| $$ \  $$\n|__/  \__/ \______/ |_______/  \_______/|__/  \__/";

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

exports.showAnyCustomMessage = (msg, category) => {
  console.log(this.getTimeFormatted(), "[" + colors.yellow(category) + "]", msg);
  if (cfg['save-logs'] == true) {
    if (!fs.existsSync("./logs/")) {
      fs.mkdirSync("./logs");
    }
    date = new Date();
    fname = date.getDate().toString().padStart(2, "0") + "-" + date.getMonth().toString().padStart(2, "0") + "-" + date.getFullYear().toString().padStart(2, "0") + ".log";
    if (fs.existsSync("./logs/" + fname)) {
      rf = fs.readFileSync("./logs/" + fname);
      rf = rf + "\n" + this.getTimeFormatted() + " [" + category + "] " + msg;
    } else {
      rf = this.getTimeFormatted() + " [" + category + "] " + msg;
    }
    fs.writeFileSync("./logs/" + fname, rf);
  }
}

exports.showTGBotMessage = (msg, username = "", chatId) => {
  if (username != "") {
    console.log(this.getTimeFormatted(), "[" + colors.yellow("TGBOT") + "]", colors.green("@" + username) + " (" + colors.cyan(chatId) + ") - " + colors.white(msg));
  } else {
    console.log(this.getTimeFormatted(), "[" + colors.yellow("TGBOT") + "]", colors.green(chatId) + " - " + colors.white(msg));
  }
  if (cfg['save-logs'] == true) {
    if (!fs.existsSync("./logs/")) {
      fs.mkdirSync("./logs");
    }
    date = new Date();
    fname = date.getDate().toString().padStart(2, "0") + "-" + date.getMonth().toString().padStart(2, "0") + "-" + date.getFullYear().toString().padStart(2, "0") + ".log";
    if (fs.existsSync("./logs/" + fname)) {
      rf = fs.readFileSync("./logs/" + fname);
      rf = rf + "\n" + this.getTimeFormatted() + " [TGBOT] " + "@" + username + " (" + chatId + ")" + " - " + msg;
    } else {
      rf = this.getTimeFormatted() + " [TGBOT] " + "@" + username + " (" + chatId + ")" + " - " + msg;
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