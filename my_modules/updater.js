const fs = require('fs');
const _cliProgress = require('cli-progress');
var colors = require('colors');
const request = require('request');
const config = require('./config').readConfig();
const additional = require('./additional');
const translator = require('./translator');

exports.checkForUpdates = (cb) => {
  options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6'
    },
    json: true
  };
  request.get("https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases", options, (error, res, body) => {
    if (error) {
      return console.error(error);
    }

    if (!error && res.statusCode == 200) {
      cb(body[0].tag_name);
    };
  });
}

function checkForUpdates_fc (cb){
  options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6'
    },
    json: true
  };
  request.get("https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases", options, (error, res, body) => {
    if (error) {
      return console.error(error);
    }

    if (!error && res.statusCode == 200) {
      cb(body[0].tag_name);
    };
  });
}

exports.setCheckingForUpdatesByInterval = (updatesInterval) => {
  console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-update1h}}", cfg['lang']));
  setInterval(function () {
    checkForUpdates_fc(function (upd) {
      if (upd != 0 && kubek_version != upd) {
        console.log(additional.getTimeFormatted(), colors.yellow(translator.translateHTML("{{consolemsg-yesupd}}", cfg['lang'])));
        console.log(additional.getTimeFormatted(), colors.yellow("https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" + upd));
        updatesByIntArray = {
          found: true,
          url: "https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" + upd
        };
      } else {
        console.log(additional.getTimeFormatted(), colors.green(translator.translateHTML("{{consolemsg-noupd}}", cfg['lang'])));
        updatesByIntArray = {
          found: false
        };
      }
    });
  }, updatesInterval);
}

exports.getFTPD = (cb) => {
  var timeout = setTimeout(function () {
    if (config.ftpd == false) {
      clearTimeout(timeout);
      console.log(additional.getTimeFormatted(), translator.translateHTML("{{consolemsg-ftpdisabled}}", cfg['lang']));
      cb();
      return;
    }
    if (process.platform != "win32") {
      clearTimeout(timeout);
      console.log(translator.translateHTML("{{consolemsg-ftpnotsup}", cfg['lang']), process.platform);
      cb();
      return;
    }
    if (!fs.existsSync("indiftpd.exe")) {
      download("https://seeroy.github.io/indiftpd/indiftpd.exe", "indiftpd.exe", () => {
        clearTimeout(timeout);
        cb();
      });
    } else {
      cb();
    }
  }, 1000);
}

const download = (url, filename, callback) => {
  const progressBar = new _cliProgress.SingleBar({
    format: colors.blue("[+]") + translator.translateHTML(" {{consolemsg-downloading-cap}} ", cfg['lang']) + filename + ' : [{bar}] {percentage}%'
  }, _cliProgress.Presets.legacy);
  const file = fs.createWriteStream(filename);
  let receivedBytes = 0
  request.get(url)
    .on('response', (response) => {
      if (response.statusCode !== 200) {
        return callback('Response status was ' + response.statusCode);
      }

      const totalBytes = response.headers['content-length'];
      progressBar.start(totalBytes, 0);
    })
    .on('data', (chunk) => {
      receivedBytes += chunk.length;
      progressBar.update(receivedBytes);
    })
    .pipe(file)
    .on('error', (err) => {
      fs.unlink(filename);
      progressBar.stop();
      return callback(err.message);
    });

  file.on('finish', () => {
    progressBar.stop();
    file.close(callback);
  });

  file.on('error', (err) => {
    fs.unlink(filename);
    progressBar.stop();
    return callback(err.message);
  });
}