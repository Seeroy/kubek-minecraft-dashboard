const fs = require("fs");
const archiver = require("archiver");
const crypto = require("crypto");
const path = require("path");
const colors = require("colors");
const decompress = require("decompress");
const additional = require("./additional");
var backups_processing = {};
var backups_processing_fs = {};
var backups_processing_status = {};

exports.getBackupsList = () => {
  if (fs.existsSync("./backups")) {
    read = fs.readdirSync("./backups");
    arr = [];
    read.forEach(function (fn) {
      if (path.extname(fn) == ".json") {
        rd = JSON.parse(fs.readFileSync("./backups/" + fn).toString());
        uid = rd["uid"];
        if (typeof backups_processing_status[uid] !== "undefined") {
          rd["processing_status"] = backups_processing_status[uid];
        }
        rd["size"] = fs.lstatSync(
          "./backups/" + fn.replace(".json", ".zip")
        ).size;
        arr.push(rd);
      }
    });
    str = JSON.stringify(arr);
    if (str == "[]") {
      ret = "none";
    } else {
      ret = JSON.stringify(arr);
    }
  } else {
    ret = "none";
    fs.mkdirSync("./backups");
  }
  return ret;
};

exports.restoreBackup = function (fn, sn, cb) {
  if (fs.existsSync("./backups/" + fn)) {
    cfg = JSON.parse(
      fs.readFileSync("./backups/" + fn.replace(".zip", ".json"))
    );
    if (cfg.type == "full") {
      fs.rmSync("./servers/" + sn, {
        recursive: true,
        force: true,
      });
      fs.mkdirSync("./servers/" + sn);
      decompress("./backups/" + fn, "./servers/" + sn)
        .then((files) => {
          cb(true);
        })
        .catch((error) => {
          cb(error);
        });
    } else {
      decompress("./backups/" + fn, "./servers/" + sn)
        .then((files) => {
          cb(true);
        })
        .catch((error) => {
          cb(error);
        });
    }
  } else {
    cb(false);
  }
};

exports.createNewBackup = (bname, desc, type, sn, ratio, files = null) => {
  date = new Date();
  randuid = crypto.randomUUID().toString();
  date_str =
    date.getDate().toString().padStart(2, "0") +
    "_" +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    "_" +
    date.getFullYear().toString().padStart(2, "0") +
    "-" +
    date.getHours().toString().padStart(2, "0") +
    "_" +
    date.getMinutes().toString().padStart(2, "0") +
    "_" +
    date.getSeconds().toString().padStart(2, "0");
  archname = "backup-" + type + "-" + date_str + ".zip";
  jsonf = {
    name: bname,
    description: desc,
    type: type,
    archive_name: archname,
    selected_files: files,
    uid: randuid,
    server: sn,
    compress_ratio: ratio,
  };
  cfgname = "backup-" + type + "-" + date_str + ".json";
  fs.writeFileSync("./backups/" + cfgname, JSON.stringify(jsonf, null, "\t"));
  backups_processing_fs[randuid] = fs.createWriteStream(
    "./backups/" + archname
  );
  ratio = parseInt(ratio);
  backups_processing[randuid] = archiver("zip", {
    zlib: {
      level: ratio,
    },
  });
  backups_processing_status[randuid] = {
    status: "started",
  };
  fsock = io.sockets.sockets;
  for (const socket of fsock) {
    socket[1].emit("handleUpdate", {
      type: "backups_list",
      data: "started",
    });
  }
  console.log(
    additional.getTimeFormatted(),
    "[" + colors.yellow("Backups") + "]",
    "Generating " + archname + " started"
  );
  backups_processing_fs[randuid].on("close", function () {
    backups_processing_status[randuid] = {
      status: "completed",
    };
    console.log(
      additional.getTimeFormatted(),
      "[" + colors.yellow("Backups") + "]",
      "Generating " + archname + " success!"
    );
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "backups_list",
        data: "completed",
      });
    }
  });
  backups_processing_fs[randuid].on("end", function () {
    backups_processing_status[randuid] = {
      status: "completed",
    };
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "backups_list",
        data: "completed",
      });
    }
    console.log(
      additional.getTimeFormatted(),
      "[" + colors.yellow("Backups") + "]",
      "Generating " + archname + " success!"
    );
  });
  backups_processing[randuid].on("warning", function (err) {
    backups_processing_status[randuid] = {
      status: "failed",
      error: err,
    };
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "backups_list",
        data: "failed",
      });
    }
    console.log(
      additional.getTimeFormatted(),
      "[" + colors.yellow("Backups") + "]",
      "Generating " + archname + " failed. Look above for error:"
    );
    console.log(err);
  });

  backups_processing[randuid].on("error", function (err) {
    backups_processing_status[randuid] = {
      status: "failed",
      error: err,
    };
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "backups_list",
        data: "failed",
      });
    }
    console.log("failed creating of" + archname);
    console.log(err);
  });

  backups_processing[randuid].on("progress", function (pr) {
    backups_processing_status[randuid] = {
      status: "processing",
      total_files: pr.entries.total,
      proc_files: pr.entries.processed,
      percent:
        pr.entries.total > 0
          ? Math.round((pr.entries.processed * 100.0) / pr.entries.total)
          : -1,
    };
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "backups_list",
        data: "progress",
      });
    }
  });

  backups_processing[randuid].pipe(backups_processing_fs[randuid]);
  if (type == "full") {
    rdd = fs.readdirSync("./servers/" + sn);
    backups_processing[randuid].directory("./servers/" + sn, false);
    backups_processing[randuid].finalize();
  } else {
    files.forEach(function (file) {
      if (file.type == "directory") {
        backups_processing[randuid].directory(
          "./servers/" + sn + "/" + file.name,
          false
        );
      } else {
        backups_processing[randuid].file("./servers/" + sn + "/" + file.name, {
          name: file.name,
        });
      }
    });
    backups_processing[randuid].finalize();
  }
  return "success";
};
