const fs = require("fs");
const path = require("path");

exports.translateHTML = (html, lang) => {
  jtranslate = fs.readFileSync(
    path.join(__dirname, "./../translations/" + lang + ".json")
  );
  jtranslate = JSON.parse(jtranslate);
  matches = [];
  matches = html.toString().match(/\{{[0-9a-zA-Z\-]+\}}/gm);
  if (matches != null) {
    matches.forEach(function (match) {
      html = html.toString().replace(match, jtranslate[match]);
    });
  }
  return html;
};
