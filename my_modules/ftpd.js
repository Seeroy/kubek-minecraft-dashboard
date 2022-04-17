const cprocess = require('child_process');
const path = require('path');
const fs = require('fs');
const additional = require('./additional');

exports.startFTPD = () => {
  if (fs.existsSync("./config.json")) {
    cfg = fs.readFileSync("./config.json");
    cfg = JSON.parse(cfg);
  }
  user = cfg["ftpd-user"];
  passwd = cfg["ftpd-password"];
  ftpserver = false;
  if(fs.existsSync("./../indiftpd.exe")){
    if (process.platform == "win32") {
      ftpserver = cprocess.spawn('indiftpd.exe', ['-U' + user, '-P' + passwd, '-H./servers']);
    }
  } else {
    console.log(additional.getTimeFormatted(), "Restart Kubek to download indiftpd.exe");
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