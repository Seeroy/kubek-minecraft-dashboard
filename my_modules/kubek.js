var osutils = require("os-utils");
var os = require("os");

exports.getUsage = (cb) => {
  var data = {};
  osutils.cpuUsage(function (value) {
    data["cpu"] = Math.round(value * 100);
    totalmem = os.totalmem();
    usedmem = totalmem - os.freemem();
    data["usedmem"] = usedmem;
    data["totalmem"] = totalmem;
    cb(data);
  });
};
