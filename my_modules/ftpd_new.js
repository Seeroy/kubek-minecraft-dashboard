const ftpd = require('ftpd');
const additional = require('./additional');
const translator = require('./translator');
var colors = require('colors');
var path = require('path');
var tgbot = require("./tgbot");

var server;

exports.startFTPD = (options, username, password) => {
  initpath = path.normalize(process.cwd() + "/servers");
  server = new ftpd.FtpServer(options.host, {
    getInitialCwd: function (conn) {
      return "/"
    },
    getRoot: function () {
      return initpath
    },
    pasvPortRangeStart: 1025,
    pasvPortRangeEnd: 1050,
    tlsOptions: options.tls,
    allowUnauthorizedTls: true,
    useWriteFile: false,
    useReadFile: false,
    uploadMaxSlurpSize: 7000,
    allowedCommands: [
      'XMKD',
      'AUTH',
      'TLS',
      'SSL',
      'USER',
      'PASS',
      'PWD',
      'OPTS',
      'TYPE',
      'PORT',
      'PASV',
      'LIST',
      'CWD',
      'MKD',
      'SIZE',
      'STOR',
      'MDTM',
      'DELE',
      'QUIT',
      'EPSV',
      'RMD',
      'RETR',
      'RNFR',
      'RNTO'
    ],
  });

  server.on('error', function (error) {
    console.log(additional.getTimeFormatted(), "[" + colors.yellow("FTPD") + "]", colors.red(translator.translateHTML("{{consolemsg-ftp-error}}", cfg['lang'])), error);
  });

  server.on('client:connected', function (connection) {
    console.log(additional.getTimeFormatted(), "[" + colors.yellow("FTPD") + "]", translator.translateHTML("{{consolemsg-ftp-started}}", cfg['lang']));

    connection.on('command:user', function (user, success, failure) {
      if (user == username) {
        success();
      } else {
        failure();
      }
    });

    connection.on('command:pass', function (pass, success, failure) {
      if (pass == password) {
        console.log(additional.getTimeFormatted(), "[" + colors.yellow("FTPD") + "]", translator.translateHTML("{{user}} " + colors.green(username) + " {{consolemsg-ftp-connect}}", cfg['lang']));
        tgbot.chatIdSave.forEach(chatId => {
          tgbot.bot.sendMessage(chatId, "🔒 [FTP] " + translator.translateHTML("{{user}} <b>" + username + "</b> {{consolemsg-ftp-connect}}", cfg['lang']), {
            parse_mode: "html"
          });
        });
        success(username);
      } else {
        failure();
      }
    });
  });

  server.debugging = 0;
  server.listen(options.port);
  console.log(additional.getTimeFormatted(), "FTPD", translator.translateHTML("{{consolemsg-usingport}}", cfg['lang']), options.port);
  return server;
}