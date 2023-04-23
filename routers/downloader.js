var express = require("express");
var router = express.Router();
var fs = require("fs");
var additional = require("./../my_modules/additional");
var request = require("request");
var config = require("./../my_modules/config");
const decompress = require("decompress");
const path = require("path");
const auth_manager = require("./../my_modules/auth_manager");
const translator = require("./../my_modules/translator");

router.use(function (req, res, next) {
  additional.showRequestInLogs(req, res);
  cfg = config.readConfig();
  ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
  if (cfg["internet-access"] == false && ip != "127.0.0.1") {
    res.send("Cannot be accessed from the internet");
  } else {
    authsucc = auth_manager.authorize(
      req.cookies["kbk__hash"],
      req.cookies["kbk__login"]
    );
    if (authsucc == true) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get("/download", function (req, res) {
  pendingTasks[req.query.filename] = 0;
  if (!fs.existsSync("./servers")) {
    fs.mkdirSync("./servers");
  }
  if (!fs.existsSync("./servers/" + req.query.server)) {
    fs.mkdirSync("./servers/" + req.query.server);
  }
  if (!fs.existsSync("./servers/" + req.query.server + "/plugins")) {
    fs.mkdirSync("./servers/" + req.query.server + "/plugins");
  }
  console.log(
    additional.getTimeFormatted(),
    translator.translateHTML("{{consolemsg-downstarted}}", cfg["lang"]) + ": ",
    req.query.filename,
    "server: " + req.query.server
  );
  if (req.query.type != "plugin") {
    startDownloadByURL(
      req.query.url,
      "./servers/" + req.query.server + "/" + req.query.filename,
      req.query.filename
    );
  } else {
    startDownloadByURL(
      req.query.url,
      "./servers/" + req.query.server + "/plugins/" + req.query.filename,
      req.query.filename
    );
  }
  fsock = io.sockets.sockets;
  for (const socket of fsock) {
    socket[1].emit("handleUpdate", {
      type: "downloadTasks",
      data: pendingTasks,
    });
  }
  res.send("Success");
});

router.get("/getPathToJava", function (req, res) {
  if (typeof req.query.server !== "undefined") {
    if (fs.existsSync("./servers/" + req.query.server + "/javabin")) {
      rd = fs.readdirSync("./servers/" + req.query.server + "/javabin");
      if (process.platform == "win32") {
        pathh = "./javabin/" + rd[0] + "/bin/java.exe";
      } else {
        pathh = "./javabin/" + rd[0] + "/bin/java";
      }
      res.send(pathh);
    } else {
      res.send(false);
    }
  } else {
    res.send(false);
  }
});

router.get("/downloadJavaForServer", function (req, res) {
  if (
    typeof req.query.serverVersion !== "undefined" &&
    typeof req.query.server !== "undefined"
  ) {
    sv = req.query.serverVersion;

    sec = sv.split(".")[1];
    ter = sv.split(".")[2];
    if (sec < 8) {
      java = "8";
    } else if (sec >= 8 && sec <= 11) {
      java = "11";
    } else if (sec >= 12 && sec <= 15) {
      java = "11";
    } else if (sec == 16) {
      if (ter <= 4) {
        java = "11";
      } else {
        java = "18";
      }
    } else if (sec >= 17) {
      java = "18";
    }
    prp = "";

    if (process.platform == "win32") {
      prp = "windows";
      prext = ".zip";
    } else if (process.platform == "linux") {
      prp = "linux";
      prext = ".tar.gz";
    } else {
      prp = "unknown";
    }

    pra = "";
    if (process.arch == "x64") {
      pra = "x64";
    } else if (process.arch == "x32") {
      pra = "x86";
    } else {
      pra = "unknown";
    }
    url =
      "https://api.adoptium.net/v3/binary/latest/" +
      java +
      "/ga/" +
      prp +
      "/" +
      pra +
      "/jdk/hotspot/normal/eclipse?project=jdk";
    fn = "java_download_" + req.query.server + "_" + sv + prext;
    pendingTasks[fn] = 0;
    console.log(
      additional.getTimeFormatted(),
      translator.translateHTML("{{consolemsg-downstarted}}", cfg["lang"]),
      ":",
      fn,
      "server: " + req.query.server
    );
    startDownloadByURLAndUnpack(
      url,
      "./servers/" + req.query.server + "/" + fn,
      fn,
      req.query.server
    );
    res.send(fn);
  } else {
    res.send(false);
  }
});

module.exports = router;

function startDownloadByURLAndUnpack(url, filename, ffn, srv) {
  var received_bytes = 0;
  var total_bytes = 0;

  request
    .get(url)
    .on("error", function (err) {
      console.log(err);
    })
    .on("response", function (data) {
      total_bytes = parseInt(data.headers["content-length"]);
      data.pipe(fs.createWriteStream(filename));
    })
    .on("data", function (chunk) {
      received_bytes += chunk.length;
      showDownloadingProgress(received_bytes, total_bytes, ffn);
    })
    .on("end", function () {
      delete pendingTasks[fn];
      console.log(
        additional.getTimeFormatted(),
        translator.translateHTML("{{consolemsg-downcompleted}}", cfg["lang"]) +
          ": " +
          ffn
      );
      fsock = io.sockets.sockets;
      for (const socket of fsock) {
        socket[1].emit("handleUpdate", {
          type: "downloadTasks",
          data: pendingTasks,
        });
        socket[1].emit("handleUpdate", {
          type: "unpackingJavaArchive",
          data: "started",
        });
      }
      decompress(filename, "./servers/" + srv + "/javabin")
        .then((files) => {
          fsock = io.sockets.sockets;
          for (const socket of fsock) {
            socket[1].emit("handleUpdate", {
              type: "unpackingJavaArchive",
              data: "completed",
            });
          }
          fs.unlinkSync(filename);
        })
        .catch((error) => {
          console.log(error);
          fsock = io.sockets.sockets;
          for (const socket of fsock) {
            socket[1].emit("handleUpdate", {
              type: "unpackingJavaArchive",
              data: error,
            });
          }
        });
    });
}

function startDownloadByURL(url, filename, ffn) {
  var received_bytes = 0;
  var total_bytes = 0;

  var outStream = fs.createWriteStream(filename);

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
      showDownloadingProgress(received_bytes, total_bytes, ffn);
    })
    .on("end", function () {
      delete pendingTasks[ffn];
      console.log(
        additional.getTimeFormatted(),
        translator.translateHTML("{{consolemsg-downcompleted}}", cfg["lang"]) +
          ": " +
          ffn
      );
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
