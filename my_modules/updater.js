const fs = require("fs");
const _cliProgress = require("cli-progress");
var colors = require("colors");
const request = require("request");
const config = require("./config").readConfig();
const additional = require("./additional");
const translator = require("./translator");
const statsCollector = require("./statistics");

exports.checkForUpdates = (cb) => {
  options = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6",
    },
    json: true,
  };
  request.get(
    "https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases",
    options,
    (error, res, body) => {
      if (error) {
        return console.error(error);
      }

      if (!error && res.statusCode == 200) {
        cb(body[0].tag_name, body);
      }
    }
  );
};

function checkForUpdates_fc(cb) {
  options = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6",
    },
    json: true,
  };
  request.get(
    "https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases",
    options,
    (error, res, body) => {
      if (error) {
        return console.error(error);
      }

      if (!error && res.statusCode == 200) {
        cb(body[0].tag_name);
      }
    }
  );
}

exports.setCheckingForUpdatesByInterval = (updatesInterval) => {
  console.log(
    additional.getTimeFormatted(),
    translator.translateHTML("{{consolemsg-update1h}}", cfg["lang"])
  );
  setInterval(function () {
    statsCollector.collectStats(cfg, kubek_version, function (stats) {
      statsCollector.sendStats(stats, false);
    });
    checkForUpdates_fc(function (upd) {
      if (
        upd != 0 &&
        kubek_version != upd &&
        typeof body !== "undefined" &&
        typeof body[0] !== "undefined" &&
        typeof body[0].assets !== "undefined"
      ) {
        console.log(
          additional.getTimeFormatted(),
          colors.yellow(
            translator.translateHTML("{{consolemsg-yesupd}}", cfg["lang"])
          )
        );
        console.log(
          additional.getTimeFormatted(),
          colors.yellow(
            "https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" +
              upd
          )
        );

        assets = body[0].assets;
        downloaded = false;
        assets.forEach(function (asset) {
          platform = process.platform.replace(/32/gm, "");
          if (asset.name.match(platform) != null) {
            url = asset.browser_download_url;
            if (fs.existsSync(url.split("/").pop())) {
              downloaded = true;
            }
          }
        });

        updatesByIntArray = {
          found: true,
          url:
            "https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" +
            upd,
          downloaded: dwn,
        };
      } else {
        console.log(
          additional.getTimeFormatted(),
          colors.green(
            translator.translateHTML("{{consolemsg-noupd}}", cfg["lang"])
          )
        );
        updatesByIntArray = {
          found: false,
        };
      }
    });
  }, updatesInterval);
};

exports.downloadLatestUpdate = function (cb) {
  options = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6",
    },
    json: true,
  };
  request.get(
    "https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases",
    options,
    (error, res, body) => {
      if (error) {
        return console.error(error);
      }

      if (
        !error &&
        res.statusCode == 200 &&
        typeof body !== "undefined" &&
        typeof body[0] !== "undefined" &&
        typeof body[0].assets !== "undefined"
      ) {
        assets = body[0].assets;
        url = "";
        assets.forEach(function (asset) {
          platform = process.platform.replace(/32/gm, "");
          if (asset.name.match(platform) != null) {
            url = asset.browser_download_url;
          }
        });
        if (url != "") {
          if (body[0].tag_name != kubek_version) {
            downloadInTasks(url, url.split("/").pop());
            cb("Starting download");
          } else {
            cb("Current version is latest version");
          }
        } else {
          cb("Platform not found in releases");
        }
      }
    }
  );
};

exports.getFTPD = (cb) => {
  var timeout = setTimeout(function () {
    if (config.ftpd == false) {
      clearTimeout(timeout);
      console.log(
        additional.getTimeFormatted(),
        translator.translateHTML("{{consolemsg-ftpdisabled}}", cfg["lang"])
      );
      cb();
      return;
    }
    if (process.platform != "win32") {
      clearTimeout(timeout);
      console.log(
        translator.translateHTML("{{consolemsg-ftpnotsup}", cfg["lang"]),
        process.platform
      );
      cb();
      return;
    }
    if (!fs.existsSync("indiftpd.exe")) {
      download(
        "https://seeroy.github.io/indiftpd/indiftpd.exe",
        "indiftpd.exe",
        () => {
          clearTimeout(timeout);
          cb();
        }
      );
    } else {
      cb();
    }
  }, 1000);
};

const download = (url, filename, callback) => {
  const progressBar = new _cliProgress.SingleBar(
    {
      format:
        colors.blue("[+]") +
        translator.translateHTML(
          " {{consolemsg-downloading-cap}} ",
          cfg["lang"]
        ) +
        filename +
        " : [{bar}] {percentage}%",
    },
    _cliProgress.Presets.legacy
  );
  const file = fs.createWriteStream(filename);
  let receivedBytes = 0;
  request
    .get(url)
    .on("response", (response) => {
      if (response.statusCode !== 200) {
        return callback("Response status was " + response.statusCode);
      }

      const totalBytes = response.headers["content-length"];
      progressBar.start(totalBytes, 0);
    })
    .on("data", (chunk) => {
      receivedBytes += chunk.length;
      progressBar.update(receivedBytes);
    })
    .pipe(file)
    .on("error", (err) => {
      fs.unlink(filename);
      progressBar.stop();
      return callback(err.message);
    });

  file.on("finish", () => {
    progressBar.stop();
    file.close(callback);
  });

  file.on("error", (err) => {
    fs.unlink(filename);
    progressBar.stop();
    return callback(err.message);
  });
};

function downloadInTasks(url, originalName) {
  var received_bytes = 0;
  var total_bytes = 0;

  var outStream = fs.createWriteStream("./update.tmp");

  request
    .get(url)
    .on("error", function (err) {
      console.log(err);
    })
    .on("response", function (data) {
      total_bytes = parseInt(data.headers["content-length"]);
    })
    .on("data", function (chunk) {
      received_bytes += chunk.length;
      showDownloadingProgress(received_bytes, total_bytes, "update.tmp");
    })
    .on("end", function () {
      pendingTasks["update.tmp"] = "ready";
      fs.renameSync("./update.tmp", originalName);
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "downloadTasks",
          data: pendingTasks,
        });
      }
    })
    .pipe(outStream);
}

function showDownloadingProgress(received, total, fn) {
  var percentage = ((received * 100) / total).toFixed(2);
  pendingTasks[fn] = Math.round(percentage);
  fsock = io.sockets.sockets;
  for (const socket of fsock) {
    socket[1].emit("handleUpdate", {
      type: "downloadTasks",
      data: pendingTasks,
    });
  }
}
