const express = require('express');
const cheerio = require('cheerio');
const app = express();
const port = 3000;
const path = require('path');
const request_lib = require('request');
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
const spawn = require('cross-spawn');
var servers_logs = [];
var servers_instances = [];
var iconvlite = require('iconv-lite');
const getIP = require('external-ip')();
const mcutil = require("minecraft-status").MinecraftQuery;
var osutils = require('os-utils');
var os = require('os');
var cp = {};
var serDeletes = {};
const fse = require('fs-extra');
const version = "v1.0.2";

var customHeaderRequest = request_lib.defaults({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/ 540.04(KHTML, like Gecko) Chrome/ 61.0.2054.24 Safari / 540.04'
  }
})

if (typeof (configjson) !== "undefined") {
  for (t in configjson) {
    servers_logs[t] = "";
    servers_instances[t] = "";
  }
}

console.log(colors.inverse('Kubek ' + version + ''));
console.log(colors.inverse('https://github.com/Seeroy/kubek-minecraft-dashboard'));
console.log(" ");

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
      console.log(colors.yellow(jsson[0].assets[0].browser_download_url));
    }
    console.log(" ");

    app.listen(port, () => {
      link = 'http://localhost:' + port;
      console.log(getTimeFormatted(), "Kubek listening on", link);
    });
  };
});

if (firstStart == false) {
  app.use("/", express.static(path.join(__dirname, './www')));

  app.get('/bukkitorg/plugins/list', function (request, response) {
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
  });

  app.get('/server/completion', (request, response) => {
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
      status: "stopped"
    };
    cge[server] = sss;
    configjson = cge;
    fs.writeFileSync("./servers/servers.json", JSON.stringify(cge));
    response.send("Success");
  });

  app.get('/servers/deletes/progress', (request, response) => {
    response.set('Content-Type', 'application/json');
    response.send(JSON.stringify(serDeletes));
  });

  app.get("/server/delete", (request, response) => {
    if (typeof (configjson[request.query.server]) !== 'undefined') {
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
      response.send("true");
    } else {
      response.send("false");
    }
  });

  app.get('/bukkitorg/versions', (request, response) => {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    response.set('Content-Type', 'application/json');
    optionss = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/ 540.04(KHTML, like Gecko) Chrome/ 61.0.2054.24 Safari / 540.04'
      },
      json: false
    };
    var jsonss = [];
    request_lib.get(request.query.url, optionss, (error, res, body) => {
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
  });

  app.get('/plugins/installed', (request, response) => {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    dirents = fs.readdirSync("./servers/" + request.query.server + "/plugins", {
      withFileTypes: true
    });
    filesNames = dirents
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);
    response.send(filesNames);
  });

  app.get('/plugins/delete', (request, response) => {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    if (fs.existsSync("./servers/" + request.query.server + "/plugins/" + request.query.file) && request.query.file.substr(request.query.file.lastIndexOf(".")) == ".jar") {
      fs.unlinkSync("./servers/" + request.query.server + "/plugins/" + request.query.file);
    }
    response.send("Success");
  });

  app.get('/servers/statuses', (request, response) => {
    read = fs.readFileSync("./servers/servers.json");
    response.set('Content-Type', 'application/json');
    response.send(read);
  });

  app.get('/server/startScript', (request, response) => {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    if (typeof (configjson[request.query.server]) !== 'undefined') {
      response.set('Content-Type', 'text/html');
      datat = fs.readFileSync("./servers/" + request.query.server + "/start.bat");
      datat = datat.toString().split("\n");
      response.send(datat[datat.length - 1]);
    } else {
      response.send("false");
    }
  });

  app.get('/server/properties/get', (request, response) => {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    if (typeof (configjson[request.query.server]) !== 'undefined') {
      response.set('Content-Type', 'application/json');
      data = fs.readFileSync("./servers/" + request.query.server + "/server.properties");
      response.send(spParser.parse(data.toString()));
    } else {
      response.send("false");
    }
  });

  app.get("/server/properties/save", function (request, response) {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    if (typeof (configjson[request.query.server]) !== 'undefined') {
      response.set('Content-Type', 'application/json');
      fs.writeFileSync("./servers/" + request.query.server + "/server.properties", Buffer.from(request.query.doc, 'base64').toString('ascii'));
      response.send("true");
    } else {
      response.send("false");
    }
  });

  app.get('/server/publicIP', (request, response) => {
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
  });

  app.get('/server/start', function (request, response) {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    if (typeof (configjson[request.query.server]) !== 'undefined' && configjson[request.query.server].status == "stopped") {
      startServer(request.query.server);
      response.send("true");
    } else {
      response.send("false");
    }
  });

  app.get("/server/log", function (request, response) {
    if (typeof (configjson[request.query.server]) !== 'undefined') {
      response.send(servers_logs[request.query.server]);
    } else {
      response.send("false");
    }
  });

  app.get('/server/command', function (request, response) {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    if (typeof (configjson[request.query.server]) !== 'undefined') {
      command = request.query.cmd;
      servers_logs[request.query.server] = servers_logs[request.query.server] + command + "\n";
      servers_instances[request.query.server].stdin.write(command + '\n');
      response.send("true");
    } else {
      response.send("false");
    }
  });

  app.get('/server/query', function (request, response) {
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
  });
} else {
  app.use("/js", express.static(path.join(__dirname, './www/js')));
  app.use("/css", express.static(path.join(__dirname, './www/css')));
  app.use("/", express.static(path.join(__dirname, './www/setup/')));

  app.get('/server/completion', (request, response) => {
    console.log(getTimeFormatted(), "GET", request.originalUrl.green);
    server = request.query.server;
    console.log(getTimeFormatted(), "EULA saved on server", server);
    fs.writeFileSync("./servers/" + server + "/eula.txt", "eula=true");
    fs.writeFileSync("./servers/" + server + "/start.bat", "@echo off\nchcp 65001>nul\ncd servers\ncd " + server + "\njava -Xms512M -Xmx" + request.query.memory + "M -jar " + request.query.jf + " nogui");
    fs.writeFileSync("./servers/" + server + "/server.properties", "server-port=" + request.query.port + "\nquery.port=" + request.query.port + "\nenable-query=true\nonline-mode=" + request.query.onMode + "\nmotd=" + server);
    cge = {};
    servers_logs[server] = "";
    servers_instances[server] = "";
    sss = {
      status: "stopped"
    };
    cge[server] = sss;
    configjson = cge;
    fs.writeFileSync("./servers/servers.json", JSON.stringify(cge));
    response.send("Success");
    console.log("RESTART APP!");
    process.exit();
  });
}

function startServer(server) {
  servers_logs[server] = "";
  servers_instances[server] = spawn("servers/" + server + "/start.bat");
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
  fs.writeFileSync("./servers/servers.json", JSON.stringify(configjson));
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
  return "[" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "]";
}

app.get('/cores/search', (request, response) => {
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
});

app.get('/cores/list', (request, response) => {
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
});

app.get('/servers/list', (request, response) => {
  console.log(getTimeFormatted(), "GET", request.originalUrl.green);
  files = fs.readdirSync("./servers");
  files.splice(files.indexOf("servers.json"), 1);
  response.send(files);
});

app.get('/file/download', (request, response) => {
  console.log(getTimeFormatted(), "GET", request.originalUrl.green);
  cp[request.query.filename] = 0;
  if (!fs.existsSync("./servers")) {
    fs.mkdirSync("./servers");
  }
  if (!fs.existsSync("./servers/" + request.query.server)) {
    fs.mkdirSync("./servers/" + request.query.server);
  }
  console.log(getTimeFormatted(), "Download started:", request.query.filename, "server: " + request.query.server);
  if (request.query.type != "plugin") {
    getInstallerFile(request.query.url, "./servers/" + request.query.server + "/" + request.query.filename, request.query.filename);
  } else {
    getInstallerFile(request.query.url, "./servers/" + request.query.server + "/plugins/" + request.query.filename, request.query.filename);
  }
  response.send("Success");
});

app.get('/tasks/progress', (request, response) => {
  response.set('Content-Type', 'application/json');
  response.send(JSON.stringify(cp));
});