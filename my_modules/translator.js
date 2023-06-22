const fs = require("fs");
const path = require("path");

var modules_translations = {
  "ru": {},
  "en": {}
};

exports.translateHTML = (html, lang) => {
  jtranslate = fs.readFileSync(
    path.join(__dirname, "./../translations/" + lang + ".json")
  );
  jtranslate = JSON.parse(jtranslate);
  matches = [];
  matches = html.toString().match(/\{{[0-9a-zA-Z\-]+\}}/gm);
  if (matches != null) {
    matches.forEach(function (match) {
      if(typeof jtranslate[match] == "undefined"){
        if(typeof modules_translations[lang] !== "undefined" && typeof modules_translations[lang][match] !== "undefined"){
          html = html.toString().replace(match, modules_translations[lang][match]);
        }
      } else {
        html = html.toString().replace(match, jtranslate[match]);
      }
    });
  }
  return html;
};

exports.addModuleTranslation = (varName, lang, varValue) => {
  modules_translations[lang][varName] = varValue;
};