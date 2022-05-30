const request = require('request');
const url = "http://m91237kd.beget.tech/savestats_kubek.php?savedata=";
var os = require('os');
var MD5 = require("crypto-js/md5");

exports.supportUID = () => {
  cp_unq = os.cpus();
  uniqueid_unq = os.version + "850_" + cp_unq[0].model + cp_unq[1].speed + Math.round(os.totalmem() / 1024 / 1024);
  uniqueid_unq = MD5(uniqueid_unq).toString();
  return uniqueid_unq;
}

exports.collectStats = (cfg, version, cb) => {
  cp_unq = os.cpus();
  uniqueid_unq = os.version + "850_" + cp_unq[0].model + cp_unq[1].speed + Math.round(os.totalmem() / 1024 / 1024);
  uniqueid_unq = MD5(uniqueid_unq).toString();
  let pform_unq = {
    name: os.type(),
    release: os.release(),
    arch: process.arch,
    version: os.version()
  }
  
  let cpu_unq = {
    model: cp_unq[0].model,
    speed: cp_unq[0].speed,
    cores: cp_unq.length
  }
  
  statss_unq = {
    platform: pform_unq,
    totalmem: Math.round(os.totalmem() / 1024 / 1024),
    cpu: cpu_unq,
    unique_id: uniqueid_unq,
    cwd: process.cwd(),
    lang: cfg.lang,
    version: version,
    username: os.userInfo().username
  }
  cb(statss_unq);
}

exports.sendStats = (stats) => {
  options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/534.45.1 (KHTML, like Gecko) Version/4.0 Safari/534.45.1'
    },
    json: true
  };
  request.get(url + encodeURIComponent(JSON.stringify(stats)), options, (error, res, body) => {
    if (error) {
      return console.error("WARNING! Error when sending stats: " + error)
    } else {
      return true;
    }
  });
}