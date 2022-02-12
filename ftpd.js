const cprocess = require('child_process');
const path = require('path');
const fs = require('fs');

exports.startFTPD = () => {
  if (fs.existsSync("./config.json")) {
    cfg = fs.readFileSync("./config.json");
    cfg = JSON.parse(cfg);
  }
  user = cfg["ftpd-user"];
  passwd = cfg["ftpd-password"];
  if (process.platform == "win32") {
    ftpserver = cprocess.spawn('indiftpd.exe', ['-U' + user, '-P' + passwd, '-H./servers']);
  } else if (process.platform == "linux") {
    ftpserver = cprocess.spawn('./indiftpd', ['-U' + user, '-P' + passwd, '-H./servers']);
  }
  return ftpserver;
}

exports.stopFTPD = () => {
  if (process.platform == "win32") {
    cprocess.exec("taskkill /f /t /im indiftpd.exe");
  } else if (process.platform == "linux") {
    cprocess.exec("pkill indiftpd");
  }
}