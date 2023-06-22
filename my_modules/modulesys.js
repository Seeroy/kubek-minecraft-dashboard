const fs = require("fs");
var translator = require("./translator");
const requireRuntime = require("require-runtime");
const additional = require("./additional");
const auth_manager = require("./auth_manager");
const path = require("path");
var mime = require("mime");
const config = require("./config");

exports.loadAllModules = () => {
  if (fs.existsSync("./modules")) {
    fs.readdirSync("./modules").forEach(function (fpath) {
      var modulecfg = JSON.parse(
        fs.readFileSync("./modules/" + fpath + "/module.json").toString()
      );
      if (exports.validateModuleConfig(modulecfg) == true) {
        Object.entries(modulecfg["routers"]).forEach((entry) => {
          const [key, value] = entry;
          app.use(
            key,
            requireRuntime("./modules/" + fpath + "/routers/" + value)
          );
        });
        Object.entries(modulecfg["translations"]).forEach((entry) => {
          const [lang, translArr] = entry;
          Object.entries(translArr).forEach((tentry) => {
            const [varName, varVal] = tentry;
            translator.addModuleTranslation(varName, lang, varVal);
          });
        });
      } else {
        console.log(
          additional.getTimeFormatted(),
          translator.translateHTML(
            "{{modulesys-failed}}" +
              modulecfg["displayName"] +
              " | CFG_INVALID",
            cfg["lang"]
          )
        );
      }
    });
    exports.initPagesHandler();
  }
};

exports.validateModuleConfig = (config) => {
  if (
    typeof config["name"] == "string" &&
    typeof config["displayName"] == "string" &&
    typeof config["description"] == "string" &&
    typeof config["routers"] == "object" &&
    typeof config["pages"]["enabled"] == "boolean" &&
    typeof config["translations"] == "object" &&
    typeof config["translations"]["ru"] == "object" &&
    typeof config["translations"]["en"] == "object"
  ) {
    return true;
  } else {
    return false;
  }
};

exports.listModules = () => {
  modules = [];
  if (fs.existsSync("./modules")) {
    fs.readdirSync("./modules").forEach(function (fpath) {
      var modulecfg = JSON.parse(
        fs.readFileSync("./modules/" + fpath + "/module.json").toString()
      );
      if (exports.validateModuleConfig(modulecfg) == true) {
        modules.push(modulecfg);
      }
    });
  }
  return modules;
};

exports.initPagesHandler = () => {
  app.use(function (req, res, next) {
    cfg = config.readConfig();
    var authsucc = auth_manager.authorize(
      req.cookies["kbk__hash"],
      req.cookies["kbk__login"]
    );
    if (
      authsucc == true ||
      path
        .extname(req["_parsedUrl"].pathname)
        .match(/.*\.(jpg|jpeg|png|js|css|html|eot|ttf|woff|woff2|eot)/gim) !=
        null
    ) {
      cfg = config.readConfig();
      pgc = "";
      mimetype = "";
      fs.readdirSync("./modules").forEach(function (fpath) {
        if (
          fs.existsSync("./modules/" + fpath + req["_parsedUrl"].pathname) &&
          path.extname(req["_parsedUrl"].pathname) != ""
        ) {
          pgc = translator.translateHTML(
            fs.readFileSync("./modules/" + fpath + req["_parsedUrl"].pathname),
            cfg.lang
          );
          mimetype = mime.getType("./modules/" + fpath + req["_parsedUrl"].pathname);
        }
      });
      if (
        path.extname(req["_parsedUrl"].pathname) != ".js" &&
        path.extname(req["_parsedUrl"].pathname) != ".png" &&
        path.extname(req["_parsedUrl"].pathname) != ".css"
      ) {
        additional.showRequestInLogs(req, res);
      }
      ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      ip = ip.replace("::ffff:", "").replace("::1", "127.0.0.1");
      if (cfg["internet-access"] == false && ip != "127.0.0.1") {
        // send nothing for better confidence
      } else {
        if (pgc != "") {
          res.set(
            "content-type",
            mimetype
          );
          res.send(pgc);
        }
      }
    } else {
      res.redirect("/login.html");
    }
    next();
  });
};
