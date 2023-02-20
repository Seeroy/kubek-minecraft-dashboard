const cprocess = require('child_process');
const fs = require('fs');
const additional = require('./additional');
const translator = require('./translator');
const config = require('./config');

exports.startFTPD = () => {
  cfg = config.readConfig();
  user = cfg["ftpd-user"];
  passwd = cfg["ftpd-password"];
  ftpserver = false;
  if(fs.existsSync("./indiftpd.exe")){
    if (process.platform == "win32") {
      ftpserver = cprocess.spawn('indiftpd.exe', ['-U' + user, '-P' + passwd, '-H./servers']);
    }
  } else {
    console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-restartkubftpd}}", cfg['lang']));
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