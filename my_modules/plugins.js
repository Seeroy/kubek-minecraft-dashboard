const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
var options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6'
  }
};

exports.searchPlugin = (search, cb) => {
  var jsons = [];
  var pg = "";
  request.get("https://dev.bukkit.org/search?search=" + search, options, (error, res, body) => {
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
      cb(jsons);
    };
  });
}

exports.getBukkitPage = (pg, cb) => {
  var jsons = [];
  if (pg > 1) {
    pg = "?page=" + pg;
  } else {
    pg = "";
  }
  request.get("https://dev.bukkit.org/bukkit-plugins" + pg, options, (error, res, body) => {
    if (error) {
      return console.error(error);
    }

    if (!error && res.statusCode == 200) {
      const $ = cheerio.load(body);
      $(".name .overflow-tip a").each(function (i, plugin) {
        if (typeof ($(plugin.parent.parent.parent.parent)[0].children[1].children[1].children[1]) !== "undefined") {
          var desc = $(".project-list-item .details .description p")[i].children[0].data.trim();
          var pluginn = {
            name: plugin.children[0].data,
            url: "https://dev.bukkit.org" + plugin.attribs.href,
            image_url: $(plugin.parent.parent.parent.parent)[0].children[1].children[1].children[1].attribs.src,
            download_url: "https://dev.bukkit.org" + plugin.attribs.href + "/files/latest",
            short_desc: desc
          };
        } else {
          var pluginn = {
            name: plugin.children[0].data,
            url: "https://dev.bukkit.org" + plugin.attribs.href,
            download_url: "https://dev.bukkit.org" + plugin.attribs.href + "/files/latest",
            short_desc: desc,
          };
        }
        jsons.push(pluginn);
      });
      cb(jsons);
    };
  });
}

exports.getPluginVersions = (url, cb) => {
  var json = [];
  request.get(url.replace('/files/latest', ''), options, (error, res, body) => {
    if (error) {
      return console.error(error);
    }

    if (!error && res.statusCode == 200) {
      request.get("https://dev.bukkit.org" + res.req.path + "/files", options, (error, res, body) => {
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
            json.push(dnn);
          });
          cb(json);
        };
      });
    };
  });
}

exports.getInstalledPlugins = (name) => {
  dirents = fs.readdirSync("./servers/" + name + "/plugins", {
    withFileTypes: true
  });
  filesNames = dirents
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name);
  return filesNames;
}

exports.deleteInstalledPlugin = (name, filename) => {
  if (fs.existsSync("./servers/" + name + "/plugins/" + filename) && filename.substr(filename.lastIndexOf(".")) == ".jar") {
    fs.unlinkSync("./servers/" + name + "/plugins/" + filename);
  }
}