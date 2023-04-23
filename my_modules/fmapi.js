const fs = require("fs");

exports.scanDirectory = (server, directory, cb) => {
  if (
    fs.existsSync("./servers/" + server + "/" + directory) &&
    fs.lstatSync("./servers/" + server + "/" + directory).isDirectory()
  ) {
    directory = directory.toString();
    rd = "./servers/" + server + "/" + directory;
    fs.readdir(rd, function (err, rd_res) {
      if (typeof rd_res !== "undefined") {
        rd_res_c = [];
        rd_res.forEach((elem) => {
          path = rd + elem;
          stat = fs.lstatSync(path);
          stat.isDirectory() ? (type = "directory") : (type = "file");
          file = {
            name: elem,
            path: path,
            type: type,
            size: stat.size,
            modify: stat.mtime,
          };
          rd_res_c.push(file);
        });
        cb(JSON.stringify(rd_res_c));
      } else {
        cb(false);
      }
    });
  } else {
    cb(false);
  }
};

exports.readFile = (server, path) => {
  if (fs.existsSync("./servers/" + server + path)) {
    path = path.toString().replaceAll(/\..\//gm, "");
    rd = fs.readFileSync("./servers/" + server + path).toString();
    return rd;
  } else {
    return false;
  }
};

exports.saveFile = (server, path, text) => {
  if (fs.existsSync("./servers/" + server + path)) {
    path = path.toString().replaceAll(/\..\//gm, "");
    text = Buffer.from(text, "base64").toString("ascii");
    fs.writeFileSync("./servers/" + server + path, text);
    return true;
  } else {
    return false;
  }
};

exports.deleteFM = (server, path) => {
  if (fs.existsSync("./servers/" + server + path)) {
    path = path.toString().replaceAll(/\..\//gm, "");
    fs.unlinkSync("./servers/" + server + path);
    return true;
  } else {
    return false;
  }
};

exports.deleteDirFM = (server, path) => {
  if (fs.existsSync("./servers/" + server + path)) {
    path = path.toString().replaceAll(/\..\//gm, "");
    try {
      fs.rmdirSync("./servers/" + server + path);
      return true;
    } catch (e) {
      return e.code;
    }
  } else {
    return false;
  }
};

exports.renameFM = (server, path, newname) => {
  if (fs.existsSync("./servers/" + server + path)) {
    path = path.toString().replaceAll(/\..\//gm, "");
    path = "./servers/" + server + path;
    np = path.split("/");
    np = np.slice(0, -1);
    np = np.join("/") + "/";
    newname = Buffer.from(newname, "base64").toString("ascii");
    fs.renameSync(path, np + newname);
    return true;
  } else {
    return false;
  }
};

exports.newdirFM = (server, path, newdir) => {
  if (fs.existsSync("./servers/" + server + path)) {
    path = path.toString().replaceAll(/\..\//gm, "");
    path = "./servers/" + server + path;
    fs.mkdirSync(path + Buffer.from(newdir, "base64").toString("ascii"));
    return true;
  } else {
    return false;
  }
};
