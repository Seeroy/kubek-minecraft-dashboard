const express = require('express');
const cheerio = require('cheerio');
const app = express();
var mime = require('mime');
const port = 3000;
const path = require('path');
const request_lib = require('request');
var crypto = require('crypto');
const fileUpload = require('express-fileupload');
const ngrok = require('ngrok');
var spParser = require("minecraft-server-properties");
const fs = require('fs');
var colors = require('colors');
var xmlParser = require('xml2js').parseString;
let url = "https://dev.bukkit.org/bukkit-plugins";
var options = {
  headers: {
    'User-Agent': 'MY IPHINE 7s'
  },
  json: false
};
var firstStart;
if (fs.existsSync("./servers/servers.json")) {
  var read = fs.readFileSync("./servers/servers.json");
  var configjson = JSON.parse(read.toString());
  firstStart = false;
} else {
  firstStart = true;
}
const spawn = require("cross-spawn");
var servers_logs = [];
var servers_instances = [];
var ngrok_instances = [];
const cookieParser = require("cookie-parser");
var iconvlite = require('iconv-lite');
const getIP = require('external-ip')();
const mcutil = require("minecraft-status").MinecraftQuery;
var osutils = require('os-utils');
var os = require('os');
var cp = {};
var serDeletes = {};
const fse = require('fs-extra');
const request = require('request');
const _cliProgress = require('cli-progress');
const {
  response
} = require('express');
const version = "v1.1.6-fix";
const ftpd = require("./ftpd.js");
const rateLimit = require('express-rate-limit');
var ftpserver;

app.use(fileUpload());
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 5000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/auth/login', authLimiter);

function getUserByAuthHash(hash) {
  cfg = JSON.parse(fs.readFileSync("./config.json"));
  if (crypto.createHash('md5').update(cfg["owner-password"]).digest('hex') == hash) {
    return cfg['owner-user'];
  } else {
    var usr;
    if (typeof (cfg['other-users']) !== "undefined" && cfg['other-users'][0] != "") {
      cfg['other-users'].forEach(function (usercfg) {
        if (crypto.createHash('md5').update(usercfg["password"]).digest('hex') == hash) {
          usr = usercfg;
        }
      });
    }
    return usr['name'];
  }
}

function userPrivileges(user) {
  cfg = JSON.parse(fs.readFileSync("./config.json"));
  if (cfg['owner-user'] == user) {
    return {
      "console-access": true,
      "server.properties-access": true,
      "plugins-access": true,
      "server-config-access": true,
      "kubek-config-access": true,
      "creating-servers-access": true,
      "users-editor-access": true
    }
  } else {
    var usr;
    if (typeof (cfg['other-users']) !== "undefined" && cfg['other-users'][0] != "") {
      cfg['other-users'].forEach(function (usercfg) {
        if (usercfg["name"] == user) {
          usr = usercfg;
        }
      });
    }
    if (typeof usr !== "undefined") {
      return usr['privileges'];
    } else {
      return {
        "console-access": false,
        "server.properties-access": false,
        "plugins-access": false,
        "server-config-access": false,
        "kubek-config-access": false,
        "creating-servers-access": false,
        "users-editor-access": false
      }
    }
  }
}

if (!fs.existsSync("config.json")) {
  fs.writeFileSync("config.json", '{"lang":"en", "ftpd":false,"ftpd-user":"kubek","ftpd-password":"kubek","auth":false,"owner-user":"kubek","owner-password":"kubek"}');
}

if (fs.existsSync("./config.json")) {
  cfg = fs.readFileSync("./config.json");
  cfg = JSON.parse(cfg);
  if (cfg.ftpd == true) {
    if (process.platform == "linux") {
      console.log("Currently FTP cannot be used on Linux, sorry");
    } else {
      ftpserver = ftpd.startFTPD();
    }
  }
}

var customHeaderRequest = request_lib.defaults({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/ 540.07(KHTML, like Gecko) Chrome/ 70.0.2054.24 Safari / 540.07'
  }
})

if (typeof (configjson) !== "undefined") {
  for (t in configjson) {
    servers_logs[t] = "";
    servers_instances[t] = "";
    ngrok_instances[t] = "";
  }
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

function isAuth(hash) {
  var authsucc = false;
  cfg = fs.readFileSync("./config.json");
  cfg = JSON.parse(cfg);
  if (cfg.auth == false) {
    authsucc = true;
  } else {
    if (typeof (hash) !== "undefined" && hash != "" && hash == crypto.createHash('md5').update(cfg["owner-password"]).digest('hex')) {
      authsucc = true;
    }
  }
  return authsucc;
}

console.log(colors.inverse('Kubek ' + version + ''));
console.log(colors.inverse('https://github.com/Seeroy/kubek-minecraft-dashboard'));
console.log(" ");

setTimeout(function () {
  if (!fs.existsSync("indiftpd.exe") || !fs.existsSync("indiftpd")) {
    download("https://seeroy.github.io/indiftpd/indiftpd.exe", "indiftpd.exe", () => {
      download("https://seeroy.github.io/indiftpd/indiftpd", "indiftpd", () => {
        //completed
      });
    });
  }
}, 1000);

request_lib.get("https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases", options, (error, res, body) => {
  if (error) {
    return console.error(error);
  }

  if (!error && res.statusCode == 200) {
    jsson = JSON.parse(body);
    if (jsson[0].tag_name == version) {
      console.log(colors.green('Updates not found'));
    } else {
      console.log(colors.yellow('Updates found! URL:'));
      console.log(colors.yellow("https://github.com/Seeroy/kubek-minecraft-dashboard/releases/tag/" + jsson[0].tag_name));
    }
    console.log(" ");
  };
  app.use(function (req, res, next) {
    var is_authsucc = false;
    cfg = fs.readFileSync("./config.json");
    cfg = JSON.parse(cfg);
    if (req["_parsedUrl"].pathname == "/login.html") {
      is_authsucc = true;
    } else {
      if (typeof (req.cookies) !== "undefined" && typeof (req.cookies["__auth__"]) !== "undefined" && req.cookies["__auth__"] != "") {
        is_authsucc = isAuth(req.cookies["__auth__"]);
      } else {
        if (cfg.auth == false) {
          is_authsucc = true;
        } else {
          is_authsucc = false;
        }
      }
    }
    if (is_authsucc == true || path.extname(req["_parsedUrl"].pathname) == ".js" || path.extname(req["_parsedUrl"].pathname) == ".png" || path.extname(req["_parsedUrl"].pathname) == ".css") {
      if (fs.existsSync(path.join(__dirname, "./www/" + req["_parsedUrl"].pathname))) {
        if (req["_parsedUrl"].pathname == "/") {
          req["_parsedUrl"].pathname = "/index.html";
        }
        file = fs.readFileSync(path.join(__dirname, "./www/" + req["_parsedUrl"].pathname));
        cfg = fs.readFileSync("./config.json");
        cfg = JSON.parse(cfg);

        jtranslate = fs.readFileSync(path.join(__dirname, "./translations/" + cfg["lang"] + ".json"));
        jtranslate = JSON.parse(jtranslate);
        matches = [];
        matches = file.toString().match(/\{{[a-zA-Z]+\}}/gm);
        if (matches != null) {
          matches.forEach(function (match) {
            file = file.toString().replace(match, jtranslate[match]);
          });
        }
        res.set('content-type', mime.getType(path.join(__dirname, "./www/" + req["_parsedUrl"].pathname)));
        res.send(file);
      }
    } else {
      res.redirect("/login.html");
    }
  });
  app.listen(port, () => {
    link = 'http://localhost:' + port;
    console.log(getTimeFormatted(), "Kubek listening on", link);
  });
});

if (firstStart == false) {
  app.get("/server/icon", function (req, res) {
    if (typeof (request.cookies) !== "undefined" && typeof (request.cookies["__auth__"]) !== "undefined" && !isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (req.query.server) !== "undefined") {
        if (fs.existsSync("./servers/" + req.query.server + "/server-icon.png")) {
          res.sendFile("servers/" + req.query.server + "/server-icon.png", {
            root: "./"
          });
        } else {
          var img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEgAAABhCAYAAAB1Tue5AAABN2lDQ1BBZG9iZSBSR0IgKDE5OTgpAAAokZWPv0rDUBSHvxtFxaFWCOLgcCdRUGzVwYxJW4ogWKtDkq1JQ5ViEm6uf/oQjm4dXNx9AidHwUHxCXwDxamDQ4QMBYvf9J3fORzOAaNi152GUYbzWKt205Gu58vZF2aYAoBOmKV2q3UAECdxxBjf7wiA10277jTG+38yH6ZKAyNguxtlIYgK0L/SqQYxBMygn2oQD4CpTto1EE9AqZf7G1AKcv8ASsr1fBBfgNlzPR+MOcAMcl8BTB1da4Bakg7UWe9Uy6plWdLuJkEkjweZjs4zuR+HiUoT1dFRF8jvA2AxH2w3HblWtay99X/+PRHX82Vun0cIQCw9F1lBeKEuf1UYO5PrYsdwGQ7vYXpUZLs3cLcBC7dFtlqF8hY8Dn8AwMZP/fNTP8gAAAAJcEhZcwAACxMAAAsTAQCanBgAAAa9aVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0OCA3OS4xNjQwMzYsIDIwMTkvMDgvMTMtMDE6MDY6NTcgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyMS4wIChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjEtMTEtMjZUMTU6MjQ6NDQrMDM6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjEtMTEtMjdUMTY6MjA6MTIrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIxLTExLTI3VDE2OjIwOjEyKzAzOjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjYzOWQ3ZDkzLTM3MGUtNWE0YS1iNmE3LWE0ZTE0ZTcyMDg2NiIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmQ1OWZmZmIyLWJmYjYtNzQ0NC05NTQxLTQ2ZmMwYmU2OTdkMyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmM4Y2MxNjZiLTliNTktN2M0OC05OGY1LWFjZjM1ZjViZmY2ZSIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJBZG9iZSBSR0IgKDE5OTgpIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOGNjMTY2Yi05YjU5LTdjNDgtOThmNS1hY2YzNWY1YmZmNmUiIHN0RXZ0OndoZW49IjIwMjEtMTEtMjZUMTU6MjQ6NDQrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4wIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NTQyMWI0ZWItYmEzYS0zMTQyLThiMWMtMTQzMjliZGNkZTc1IiBzdEV2dDp3aGVuPSIyMDIxLTExLTI2VDE1OjI0OjQ0KzAzOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjEuMCAoV2luZG93cykiIHN0RXZ0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", 'base64');

          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
          });
          res.end(img);
        }
      } else {
        res.send("");
      }
    }
  });

  app.get("/server/ngrok/save", function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      read = fs.readFileSync("./servers/servers.json");
      read = JSON.parse(read);
      read[request.query.server].ngrok = request.query.ngrok;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(read));
    }
  });

  app.get("/auth/myPrivileges", function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      user = getUserByAuthHash(request.cookies["__auth__"]);
      response.set('Content-Type', 'application/json');
      response.send(userPrivileges(user));
    }
  });

  app.get('/bukkitorg/plugins/search', function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      response.set('Content-Type', 'application/json');
      var jsons = [];
      var pg = "";
      customHeaderRequest.get("https://dev.bukkit.org/search?search=" + request.query.search, options, (error, res, body) => {
        if (error) {
          return console.error(error);
        }

        if (!error && res.statusCode == 200) {
          const $ = cheerio.load(body);
          $(".results-name").each(function (i, plugin) {
            if (typeof (plugin.parent.parent.children[1].children[1].children[1]) !== "undefined") {
              var pluginn = {
                name: plugin.children[1].children[0].data,
                url: "https://dev.bukkit.org" + plugin.children[1].attribs.href,
                download_url: "https://dev.bukkit.org" + plugin.children[1].attribs.href + "/files/latest",
                image_url: plugin.parent.parent.children[1].children[1].children[1].attribs.src
              };
            } else {
              var pluginn = {
                name: plugin.children[1].children[0].data,
                url: "https://dev.bukkit.org" + plugin.children[1].attribs.href,
                download_url: "https://dev.bukkit.org" + plugin.children[1].attribs.href + "/files/latest"
              };
            }
            jsons.push(pluginn);
          });
          response.send(JSON.stringify(jsons));
        };
      });
    }
  });

  app.get('/bukkitorg/plugins/list', function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      response.set('Content-Type', 'application/json');
      var jsons = [];
      var pg = "";
      if (typeof (request.query.page) !== "undefined" && request.query.page > 1) {
        pg = "?page=" + request.query.page;
      }
      customHeaderRequest.get(url + pg, options, (error, res, body) => {
        if (error) {
          return console.error(error);
        }

        if (!error && res.statusCode == 200) {
          const $ = cheerio.load(body);
          $(".name .overflow-tip a").each(function (i, plugin) {
            fs.existsSync("./servers/" + request.query.server + "/plugins/" + plugin.children[0].data + ".jar") ? sb = false : sb = true;
            if (typeof ($(plugin.parent.parent.parent.parent)[0].children[1].children[1].children[1]) !== "undefined") {
              var desc = $(".project-list-item .details .description p")[i].children[0].data.trim();
              var pluginn = {
                name: plugin.children[0].data,
                url: "https://dev.bukkit.org" + plugin.attribs.href,
                image_url: $(plugin.parent.parent.parent.parent)[0].children[1].children[1].children[1].attribs.src,
                download_url: "https://dev.bukkit.org" + plugin.attribs.href + "/files/latest",
                short_desc: desc,
                showbtn: sb
              };
            } else {
              var pluginn = {
                name: plugin.children[0].data,
                url: "https://dev.bukkit.org" + plugin.attribs.href,
                download_url: "https://dev.bukkit.org" + plugin.attribs.href + "/files/latest",
                short_desc: desc,
                showbtn: sb
              };
            }
            jsons.push(pluginn);
          });
          response.send(JSON.stringify(jsons));
        };
      });
    }
  });

  app.get('/server/completion', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      server = request.query.server;
      console.log(getTimeFormatted(), "EULA saved on server", server);
      fs.writeFileSync("./servers/" + server + "/eula.txt", "eula=true");
      fs.writeFileSync("./servers/" + server + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + server + "\njava -Xms512M -Xmx" + request.query.memory + "M -jar " + request.query.jf + " nogui");
      fs.writeFileSync("./servers/" + server + "/server.properties", "server-port=" + request.query.port + "\nquery.port=" + request.query.port + "\nenable-query=true\nonline-mode=" + request.query.onMode + "\nmotd=" + server);
      cge = JSON.parse(fs.readFileSync("./servers/servers.json").toString());
      servers_logs[server] = "";
      servers_instances[server] = "";
      sss = {
        status: "stopped",
        ngrok: "off"
      };
      cge[server] = sss;
      configjson = cge;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(cge));
      response.send("Success");
    }
  });

  app.get('/servers/deletes/progress', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      response.set('Content-Type', 'application/json');
      response.send(JSON.stringify(serDeletes));
    }
  });

  app.get("/server/delete", (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        fs.readdir("./servers", (err, files) => {
          if (files.length == 2) {
            setTimeout(function () {
              fs.rm("./servers", {
                recursive: true,
                force: true
              }, function () {
                console.log("RESTART APP!");
                process.exit();
              });
            }, 500);
          } else {
            delete configjson[request.query.server];
            fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
            serDeletes[request.query.server] = "deleting";
            setTimeout(function () {
              fs.rm("./servers/" + request.query.server, {
                recursive: true,
                force: true
              }, function () {
                delete serDeletes[request.query.server];
              });
            }, 500);
          }
        });
        response.send("true");
      } else {
        response.send("false");
      }
    }
  });

  app.get('/bukkitorg/versions', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      response.set('Content-Type', 'application/json');
      optionss = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/ 540.04(KHTML, like Gecko) Chrome/ 61.0.2054.24 Safari / 540.04'
        },
        json: false
      };
      var jsonss = [];
      request_lib.get(request.query.url.replace('/files/latest', ''), optionss, (error, res, body) => {
        if (error) {
          return console.error(error);
        }

        if (!error && res.statusCode == 200) {
          request_lib.get("https://dev.bukkit.org" + res.req.path + "/files", optionss, (error, res, body) => {
            if (error) {
              return console.error(error);
            }

            if (!error && res.statusCode == 200) {
              const $ = cheerio.load(body);
              $(".project-file-list-item .project-file-name").each(function (i, item) {
                var dnn = {
                  name: item.children[1].children[3].children[1].attribs["data-name"],
                  url: "https://dev.bukkit.org" + item.children[1].children[3].children[1].attribs.href + "/download"
                };
                jsonss.push(dnn);
              });
              response.send(jsonss);
            };
          });
        };
      });
    }
  });

  app.get('/plugins/installed', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (fs.existsSync("./servers/" + request.query.server + "/plugins")) {
        dirents = fs.readdirSync("./servers/" + request.query.server + "/plugins", {
          withFileTypes: true
        });
        filesNames = dirents
          .filter(dirent => dirent.isFile())
          .map(dirent => dirent.name);
        response.send(filesNames);
      } else {
        tr = [];
        response.set("content-type", "application/json");
        tt = JSON.stringify(tr);
        response.send(tt);
      }
    }
  });

  app.get('/plugins/delete', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (fs.existsSync("./servers/" + request.query.server + "/plugins/" + request.query.file) && request.query.file.substr(request.query.file.lastIndexOf(".")) == ".jar") {
        fs.unlinkSync("./servers/" + request.query.server + "/plugins/" + request.query.file);
      }
      response.send("Success");
    }
  });

  app.get('/servers/statuses', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      read = fs.readFileSync("./servers/servers.json");
      response.set('Content-Type', 'application/json');
      response.send(read);
    }
  });

  app.get('/server/startScript', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.set('Content-Type', 'text/html');
        datat = fs.readFileSync("./servers/" + request.query.server + "/start.bat");
        datat = datat.toString().split("\n");
        response.send(datat[datat.length - 1]);
      } else {
        response.send("false");
      }
    }

  });

  app.get('/server/properties/get', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.set('Content-Type', 'application/json');
        data = fs.readFileSync("./servers/" + request.query.server + "/server.properties");
        response.send(spParser.parse(data.toString()));
      } else {
        response.send("false");
      }
    }
  });

  app.get("/server/properties/save", function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.set('Content-Type', 'application/json');
        fs.writeFileSync("./servers/" + request.query.server + "/server.properties", Buffer.from(request.query.doc, 'base64').toString('ascii'));
        response.send("true");
      } else {
        response.send("false");
      }
    }
  });

  app.get('/server/publicIP', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        data = fs.readFileSync("./servers/" + request.query.server + "/server.properties");
        data = spParser.parse(data.toString());
        getIP((err, ip) => {
          if (err) {
            throw err;
          }
          response.send(ip + ":" + data["server-port"]);
        });
      } else {
        response.send("false");
      }
    }
  });

  app.get('/server/start', function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (typeof (configjson[request.query.server]) !== 'undefined' && configjson[request.query.server].status == "stopped") {
        startServer(request.query.server);
        response.send("true");
      } else {
        response.send("false");
      }
    }
  });

  app.get("/server/log", function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        response.send(servers_logs[request.query.server]);
      } else {
        response.send("false");
      }
    }
  });

  app.get('/server/command', function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        command = request.query.cmd;
        servers_logs[request.query.server] = servers_logs[request.query.server] + command + "\n";
        servers_instances[request.query.server].stdin.write(command + '\n');
        response.send("true");
      } else {
        response.send("false");
      }
    }
  });

  app.get("/server/ngrokIP", function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      if (typeof (configjson[request.query.server]) !== 'undefined') {
        if (ngrok_instances[request.query.server] != "") {
          response.send(ngrok_instances[request.query.server]);
        } else {
          response.send(" ");
        }
      } else {
        response.send(" ");
      }
    }
  });

  app.get('/server/query', function (request, response) {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      if (typeof (configjson[request.query.server]) !== 'undefined' && configjson[request.query.server].status != "stopped") {
        data = fs.readFileSync("./servers/" + request.query.server + "/server.properties");
        data = spParser.parse(data.toString());
        pid = servers_instances[request.query.server].pid;

        mcutil.fullQuery("127.0.0.1", data["server-port"], 3000)
          .then((data) => {
            osutils.cpuUsage(function (value) {
              data["cpu"] = Math.round(value * 100);
              totalmem = os.totalmem();
              usedmem = totalmem - os.freemem();
              data["usedmem"] = usedmem;
              data["totalmem"] = totalmem;
              response.send(data);
            });
          })
          .catch((error) => {
            response.send("Check error in console");
            console.error(error);
          });

      } else {
        response.send("false");
      }
    }
  });
} else {
  app.use("/js", express.static(path.join(__dirname, './www/js')));
  app.use("/css", express.static(path.join(__dirname, './www/css')));
  app.use("/", express.static(path.join(__dirname, './www/setup/')));

  app.get('/server/completion', (request, response) => {
    if (!isAuth(request.cookies["__auth__"])) {
      response.redirect("/login.html");
    } else {
      console.log(getTimeFormatted(), "GET", request.originalUrl.green);
      server = request.query.server;
      console.log(getTimeFormatted(), "EULA saved on server", server);
      fs.writeFileSync("./servers/" + server + "/eula.txt", "eula=true");
      if (process.platform == "win32") {
        fs.writeFileSync("./servers/" + server + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + server + "\njava -Xms512M -Xmx" + request.query.memory + "M -jar " + request.query.jf + " nogui");
      } else if (process.platform == "linux") {
        fs.writeFileSync("./servers/" + server + "/start.sh", "cd servers\ncd " + server + "\njava -Xms512M -Xmx" + request.query.memory + "M -jar " + request.query.jf + " nogui");
      } else {
        console.log(colors.red(getTimeFormatted() + " " + process.platform + " not supported"));
      }
      fs.writeFileSync("./servers/" + server + "/server.properties", "server-port=" + request.query.port + "\nquery.port=" + request.query.port + "\nenable-query=true\nonline-mode=" + request.query.onMode + "\nmotd=" + server);
      cge = {};
      servers_logs[server] = "";
      servers_instances[server] = "";
      sss = {
        status: "stopped",
        ngrok: "off"
      };
      cge[server] = sss;
      configjson = cge;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(cge));
      response.send("Success");
      console.log("RESTART APP!");
      process.exit();
    }
  });
}

function startServer(server) {
  servers_logs[server] = "";
  if (process.platform == "win32") {
    startFile = path.resolve("./servers/" + server + "/start.bat");
    if (fs.existsSync(startFile)) {
      servers_instances[server] = spawn('"servers/' + server + '/start.bat"');
      start = true;
    } else {
      console.log(colors.red(getTimeFormatted() + " " + '"servers/' + server + '/start.bat"' + " not found! Try to delete, and create new server!"));
      start = false;
    }
  } else if (process.platform == "linux") {
    startFile = path.resolve("./servers/" + server + "/start.sh");
    if (fs.existsSync(startFile)) {
      servers_instances[server] = spawn('sh', ["./servers/" + server + "/start.sh"]);
      start = true;
    } else {
      console.log(colors.red(getTimeFormatted() + " " + '"servers/' + server + '/start.sh"' + " not found! Try to delete, and create new server!"));
      start = false;
    }
  } else {
    console.log(colors.red(getTimeFormatted() + " " + process.platform + " not supported"));
    start = false;
  }

  if (start == true) {
    configjson = JSON.parse(fs.readFileSync("./servers/servers.json"));
    console.log(getTimeFormatted(), "STARTING SERVER:", server.green);
    statuss = "starting";
    servers_instances[server].on('close', (code) => {
      statuss = "stopped";
      configjson[server].status = statuss;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
      if (code != 0) {
        servers_logs[server] = servers_logs[server] + "<br>" + "ERROR: Process finished with exit code " + code;
        console.log(getTimeFormatted(), "STOPPED SERVER WITH CODE " + code + ":", server.red);
      } else {
        if (ngrok_instances[server] != "") {
          (async function () {
            await ngrok.disconnect(ngrok_instances[server]);
            ngrok_instances[server] = "";
          })();
        }
        console.log(getTimeFormatted(), "STOPPED SERVER:", server.green);
      }
    });
    servers_instances[server].stdout.on('data', (data) => {
      data = iconvlite.decode(data, "win1251");
      servers_logs[server] = servers_logs[server] + "<br>" + data.toString();
      if (data.indexOf("Loading libraries, please wait...") >= 0) {
        statuss = "starting";
      }
      if (data.indexOf("Done") >= 0) {
        if (configjson[server].ngrok == "on") {
          data = fs.readFileSync("./servers/" + server + "/server.properties");
          parseData = spParser.parse(data.toString());
          serverport = parseData["server-port"];
          (async function () {
            ngrok_instances[server] = await ngrok.connect({
              proto: 'tcp',
              addr: serverport
            });
          })();
        }
        statuss = "started";
        console.log(getTimeFormatted(), "STARTED SERVER:", server.green);
      }
      if (data.indexOf("Saving players") >= 0) {
        console.log(getTimeFormatted(), "STOPPING SERVER:", server.green);
        statuss = "stopping";
      }
      configjson[server].status = statuss;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
    });
    servers_instances[server].stderr.on('data', (data) => {
      data = iconvlite.decode(data, "win1251");
      servers_logs[server] = servers_logs[server] + "<br>ERROR: " + data.toString();
      configjson[server].status = statuss;
      fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
    });
    fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
  }
}

function getInstallerFile(installerfileURL, installerfilename, ffn) {
  var received_bytes = 0;
  var total_bytes = 0;

  var outStream = fs.createWriteStream(installerfilename);

  request_lib
    .get(installerfileURL)
    .on('error', function (err) {
      console.log(err);
    })
    .on('response', function (data) {
      total_bytes = parseInt(data.headers['content-length']);
    })
    .on('data', function (chunk) {
      received_bytes += chunk.length;
      showDownloadingProgress(received_bytes, total_bytes, ffn);
    })
    .on('end', function () {
      delete cp[ffn];
      console.log(getTimeFormatted(), "Download complete: " + ffn);
    })
    .pipe(outStream);
};

function showDownloadingProgress(received, total, fn) {
  var percentage = ((received * 100) / total).toFixed(2);
  cp[fn] = Math.round(percentage);
}

function getTimeFormatted() {
  date = new Date();
  return "[" + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0") + ":" + date.getSeconds().toString().padStart(2, "0") + "]";
}

app.get('/cores/search', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    core = request.query.core;
    core_ver = core.split(" ")[1];
    core_name = core.split(" ")[0];
    if (core_name == "Paper") {
      request_lib("https://papermc.io/api/v2/projects/paper/versions/" + core_ver, options, (error, res, body) => {
        if (error) {
          return console.log(error)
        };

        if (!error && res.statusCode == 200) {
          jsn = JSON.parse(body);
          lastbuild = Math.max.apply(null, jsn.builds);
          request_lib("https://papermc.io/api/v2/projects/paper/versions/" + core_ver + "/builds/" + lastbuild, options, (error, res, body) => {
            if (error) {
              return console.log(error)
            };

            if (!error && res.statusCode == 200) {
              jsn = JSON.parse(body);
              url = "https://papermc.io/api/v2/projects/paper/versions/" + core_ver + "/builds/" + lastbuild + "/downloads/" + jsn.downloads.application.name;
              response.send(url);
            }
          });
        }
      });
    }
  }
});

app.get('/cores/list', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    response.set('Content-Type', 'application/json');

    var jsona = [];
    optionss = {
      headers: {
        'User-Agent': 'MY IPHINE 7s'
      },
      json: false
    };

    optionss2 = {
      headers: {
        'User-Agent': 'MY IPHINE 7s'
      },
      json: true
    };
    request_lib("https://papermc.io/api/v2/projects/paper", optionss2, (error, res, body) => {
      if (error) {
        return console.log(error)
      };

      if (!error && res.statusCode == 200) {
        coreName = "Paper";
        body.versions.forEach(version => {
          jsona.push(coreName + " " + version.split("-")[0]);
        });
        response.send(jsona);
      };
    });
  }
});

app.get('/cores/spigot/list', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    response.set('Content-Type', 'application/json');

    optionss2 = {
      headers: {
        'User-Agent': 'MY IPHINE 7s'
      },
      json: true
    };
    request_lib("https://seeroy.github.io/spigots.json", optionss2, (error, res, body) => {
      if (error) {
        return console.log(error)
      };

      if (!error && res.statusCode == 200) {
        response.send(body);
      };
    });
  }
});

app.get('/servers/list', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    files = fs.readdirSync("./servers");
    files.splice(files.indexOf("servers.json"), 1);
    response.send(files);
  }
});

app.get('/file/download', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    cp[request.query.filename] = 0;
    if (!fs.existsSync("./servers")) {
      fs.mkdirSync("./servers");
    }
    if (!fs.existsSync("./servers/" + request.query.server)) {
      fs.mkdirSync("./servers/" + request.query.server);
    }
    if (!fs.existsSync("./servers/" + request.query.server + "/plugins")) {
      fs.mkdirSync("./servers/" + request.query.server + "/plugins");
    }
    console.log(getTimeFormatted(), "Download started:", request.query.filename, "server: " + request.query.server);
    if (request.query.type != "plugin") {
      getInstallerFile(request.query.url, "./servers/" + request.query.server + "/" + request.query.filename, request.query.filename);
    } else {
      getInstallerFile(request.query.url, "./servers/" + request.query.server + "/plugins/" + request.query.filename, request.query.filename);
    }
    response.send("Success");
  }
});

app.get('/tasks/progress', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    response.set('Content-Type', 'application/json');
    response.send(JSON.stringify(cp));
  }
});

app.get('/kubek/version', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    response.send(version);
  }
});

app.get('/kubek/usage', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    var data = {};
    osutils.cpuUsage(function (value) {
      data["cpu"] = Math.round(value * 100);
      totalmem = os.totalmem();
      usedmem = totalmem - os.freemem();
      data["usedmem"] = usedmem;
      data["totalmem"] = totalmem;
      response.send(data);
    });
  }
});

app.get("/kubek/config", (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    response.send(fs.readFileSync("./config.json").toString());
  }
});

app.get("/kubek/saveConfig", (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    fs.writeFileSync("./config.json", request.query.data);
    response.send("true");
  }
});

app.post('/file/upload', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    let sampleFile;
    let uploadPath;

    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).send('No files were uploaded.');
    }

    sampleFile = request.files['g-img-input'];
    uploadPath = __dirname + "/servers/" + request.query["server"] + "/server-icon.png";

    if (path.extname(sampleFile.name) == ".png") {
      sampleFile.mv(uploadPath, function (err) {
        if (err)
          return response.status(400).send(err);

        response.send("uploaded");
      });
    } else {
      return response.status(400).send("false");
    }
  }
});

app.post('/core/upload', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    if (!fs.existsSync("./servers")) {
      fs.mkdirSync("./servers");
    }
    fs.mkdirSync("./servers/" + request.query["server"]);
    let sampleFile;
    let uploadPath;

    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).send('No files were uploaded.');
    }

    sampleFile = request.files['g-core-input'];
    uploadPath = __dirname + "/servers/" + request.query["server"] + "/" + sampleFile.name;

    if (path.extname(sampleFile.name) == ".jar") {
      sampleFile.mv(uploadPath, function (err) {
        if (err)
          return response.status(400).send(err);

        response.send("uploaded");
      });
    } else {
      return response.status(400).send("false");
    }
  }
});

app.post('/plugin/upload', (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    if (!fs.existsSync("./servers/" + request.query["server"] + "/plugins")) {
      fs.mkdirSync("./servers/" + request.query["server"] + "/plugins");
    }
    let sampleFile;
    let uploadPath;

    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).send('No files were uploaded.');
    }

    sampleFile = request.files['g-plugin-input'];
    uploadPath = __dirname + "/servers/" + request.query["server"] + "/plugins/" + sampleFile.name;

    if (path.extname(sampleFile.name) == ".jar") {
      sampleFile.mv(uploadPath, function (err) {
        if (err)
          return response.status(400).send(err);

        response.send("uploaded");
      });
    } else {
      return response.status(400).send("false");
    }
  }
});

app.get("/ftpd/set", (request, response) => {
  if (!isAuth(request.cookies["__auth__"])) {
    response.redirect("/login.html");
  } else {
    ftpd.stopFTPD();
    setTimeout(function () {
      if (request.query.value == "true") {
        if (process.platform == "linux") {
          console.log("Currently FTP cannot be used on Linux, sorry");
          cfg = fs.readFileSync("./config.json");
          cfg = JSON.parse(cfg);
          cfg.ftpd = false;
        } else {
          ftpserver = ftpd.startFTPD();
          cfg = fs.readFileSync("./config.json");
          cfg = JSON.parse(cfg);
          cfg.ftpd = true;
        }
        fs.writeFileSync("./config.json", JSON.stringify(cfg));
      } else {
        ftpd.stopFTPD();
        cfg = fs.readFileSync("./config.json");
        cfg = JSON.parse(cfg);
        cfg.ftpd = false;
        fs.writeFileSync("./config.json", JSON.stringify(cfg));
      }
      response.send("true");
    }, 500);
  }
});

app.get("/auth/login", (request, response) => {
  cfg = fs.readFileSync("./config.json");
  cfg = JSON.parse(cfg);
  if (request.query.password == cfg["owner-password"] && request.query.login == cfg["owner-user"]) {
    let options = {
      maxAge: 120 * 24 * 60 * 60 * 1000,
      httpOnly: true
    }
    response.cookie("__auth__", crypto.createHash('md5').update(cfg["owner-password"]).digest('hex'), options);
    response.redirect("/");
  } else {
    response.send("Wrong credetinals!");
  }
});