var express = require("express");
var router = express.Router();
var path = require("path");
var fs = require("fs");
var config = require("./../my_modules/config");
const auth_manager = require("./../my_modules/auth_manager");
const { spawn } = require("node:child_process");
var iconvlite = require("iconv-lite");
var colors = require("colors");
const translator = require("./../my_modules/translator");
const additional = require("./../my_modules/additional");

const ACCESS_PERMISSION = "server_settings";

router.use(function (req, res, next) {
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
    perms = auth_manager.getUserPermissions(req);
    if (authsucc == true && perms.includes(ACCESS_PERMISSION)) {
      next();
    } else {
      res.redirect("/login.html");
    }
  }
});

router.get("/start", function (req, res) {
  startForgeInstaller(req.query.server, req.query.filename);
  res.send("true");
});

router.get("/progress", function (req, res) {
  res.send(forgesIns[req.query.server]);
});

module.exports = router;

function startForgeInstaller(server, file) {
  fp = "./servers/" + server + "/" + file;

  if (process.platform == "win32") {
    fs.writeFileSync(
      "./servers/" + server + "/finstall.bat",
      "@echo off\nchcp 65001>nul\ncd servers\ncd " +
        server +
        "\njava -jar " +
        file +
        " -i ."
    );
    startFile = path.resolve("./servers/" + server + "/finstall.bat");
    fi = spawn(startFile);
  } else if (process.platform == "linux") {
    fs.writeFileSync(
      "./servers/" + server + "/finstall.sh",
      "cd servers\ncd " + server + "\njava -jar " + file + " -i ."
    );
    startFile = path.resolve("./servers/" + server + "/finstall.sh");
    fi = spawn("sh", [startFile]);
  } else {
    console.log(
      colors.red(
        additional.getTimeFormatted() +
          " " +
          process.platform +
          translator.translateHTML(" {{consolemsg-notsup}}", cfg["lang"])
      )
    );
  }

  fi.on("close", (code) => {
    if (code == 0) {
      console.log(
        colors.green(
          additional.getTimeFormatted() +
            " " +
            translator.translateHTML(
              "Forge {{consolemsg-succinst}} ",
              cfg["lang"]
            ) +
            server
        )
      );
      forgesIns[server] = "allisok";
      fs.unlinkSync(fp);
    } else {
      console.log(
        colors.red(
          additional.getTimeFormatted() +
            " " +
            translator.translateHTML(
              "Forge {{consolemsg-failinst}} ",
              cfg["lang"]
            ) +
            server +
            translator.translateHTML(
              " {{consolemsg-succinst-2}} ",
              cfg["lang"]
            ) +
            code
        )
      );
    }
  });
  fi.stdout.on("data", (data) => {
    data = iconvlite.decode(data, "win1251");
    forgesIns[server] = forgesIns[server] + data.toString();
  });
  fi.stderr.on("data", (data) => {
    data = iconvlite.decode(data, "win1251");
    forgesIns[server] = forgesIns[server] + data.toString();
  });
}
