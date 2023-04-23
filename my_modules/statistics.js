const request = require("request");
const url = "http://seeroycloud.tk:8080/save_kubek?savedata=";
const fs = require("fs");
var os = require("os");
var MD5 = require("crypto-js/md5");
var config = require("./config");

exports.supportUID = () => {
  cp_unq = os.cpus();
  uniqueid_unq =
    os.version +
    "850_" +
    cp_unq[0].model +
    cp_unq[0].speed +
    Math.round(os.totalmem() / 1024 / 1024);
  uniqueid_unq = MD5(uniqueid_unq).toString();
  return uniqueid_unq;
};

exports.collectStats = (cfg, version, cb) => {
  cp_unq = os.cpus();
  uniqueid_unq =
    os.version +
    "850_" +
    cp_unq[0].model +
    cp_unq[0].speed +
    Math.round(os.totalmem() / 1024 / 1024);
  uniqueid_unq = MD5(uniqueid_unq).toString();

  cfgs = config.readServersJSON();
  cfgu = config.readUsersConfig();
  usrs_count = Object.keys(cfgu).length;
  crs_length = Object.keys(cfgs).length;

  directories = [
    "C:/Program Files",
    "C:/Program Files(x86)",
    "C:/Program Files (x86)",
  ];
  tree = [
    "Java",
    "JDK",
    "OpenJDK",
    "OpenJRE",
    "Adoptium",
    "JRE",
    "AdoptiumJRE",
    "Temurin",
  ];
  javas = [];
  directories.forEach(function (mainDir) {
    tree.forEach(function (inner) {
      directory = mainDir + "/" + inner;
      if (fs.existsSync(directory)) {
        fs.readdirSync(directory).forEach(function (jvs) {
          if (fs.existsSync(directory + "/" + jvs + "/bin/java.exe")) {
            javas.push(directory + "/" + jvs + "/bin/java.exe");
          }
        });
      }
    });
  });

  let pform_unq = {
    name: os.type(),
    release: os.release(),
    arch: process.arch,
    version: os.version(),
  };

  let cpu_unq = {
    model: cp_unq[0].model,
    speed: cp_unq[0].speed,
    cores: cp_unq.length,
  };

  statss_unq = {
    platform: pform_unq,
    totalmem: Math.round(os.totalmem() / 1024 / 1024),
    cpu: cpu_unq,
    unique_id: uniqueid_unq,
    cwd: process.cwd(),
    lang: cfg.lang,
    version: version,
    username: os.userInfo().username,
    javas: JSON.stringify(javas),
    servers_count: crs_length,
    auth_enabled: cfg.auth,
    users_count: usrs_count,
  };
  cb(statss_unq);
};

exports.sendStats = (stats) => {
  options = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/534.45.1 (KHTML, like Gecko) Version/4.0 Safari/534.45.1",
    },
    json: true,
  };
  request.get(
    url + encodeURIComponent(JSON.stringify(stats)),
    options,
    (error, res, body) => {
      if (error) {
        return console.error("WARNING! Error when sending stats: " + error);
      } else {
        return true;
      }
    }
  );
};
