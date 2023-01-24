const fs = require('fs');
const _cliProgress = require('cli-progress');
var colors = require('colors');
const request = require('request');
const config = require('./config').readConfig();
const additional = require('./additional');

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
  console.log(additional.getTimeFormatted(), "Kubek will check updates every 1 hour");
  setInterval(function () {
    console.log(additional.getTimeFormatted(), "Checking for Kubek updates...");
    checkForUpdates_fc(function (upd) {
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
}

exports.getFTPD = (cb) => {
  var timeout = setTimeout(function () {
    if (config.ftpd == false) {
      clearTimeout(timeout);
      console.log(additional.getTimeFormatted(), "FTP is disabled in config, stopping download of indiftpd.exe");
      cb();
      return;
    }
    if (process.platform == "linux") {
      clearTimeout(timeout);
      console.log(additional.getTimeFormatted(), "Currently FTP is not supported on linux");
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
    format: colors.blue("[+]") + ' Downloading ' + filename + ' : [{bar}] {percentage}%'
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