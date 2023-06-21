const request = require("request");
var options = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6",
  },
};

exports.getCoreURL_externalMethod = (url, version, cb) => {
  request.get(url, options, (error, res, body) => {
    if (error) {
      return console.log(error);
    }

    if (!error && res.statusCode == 200) {
      bparse = JSON.parse(body);
      cb(bparse[version]);
    }
  });
};

exports.getCoreURL_purpurMethod = (version, cb) => {
  cb("https://api.purpurmc.org/v2/purpur/" + version + "/latest/download");
};

exports.getCoreURL_magmaMethod = (version, cb) => {
  cb("https://api.magmafoundation.org/api/v2/" + version + "/latest/download");
};

exports.getCoreURL_paperMethod = (core, version, cb) => {
  request.get(
    "https://papermc.io/api/v2/projects/" + core + "/versions/" + version,
    options,
    (error, res, body) => {
      if (error) {
        console.log(error);
      }

      if (!error && res.statusCode == 200) {
        jsn = JSON.parse(body);
        lastbuild = Math.max.apply(null, jsn.builds);
        request.get(
          "https://papermc.io/api/v2/projects/" +
            core +
            "/versions/" +
            version +
            "/builds/" +
            lastbuild,
          options,
          (error, res, body) => {
            if (error) {
              console.log(error);
            }

            if (!error && res.statusCode == 200) {
              jsn = JSON.parse(body);
              url =
                "https://papermc.io/api/v2/projects/" +
                core +
                "/versions/" +
                version +
                "/builds/" +
                lastbuild +
                "/downloads/" +
                jsn.downloads.application.name;
              cb(url);
            }
          }
        );
      }
    }
  );
};

exports.paperVersionsMethod = (core, cb) => {
  var jsona = [];
  request.get(
    "https://papermc.io/api/v2/projects/" + core,
    options,
    (error, res, body) => {
      if (error) {
        return console.log(error);
      }

      if (!error && res.statusCode == 200) {
        body = JSON.parse(body);
        jsona = body.versions;
        jsona.reverse();
        cb(jsona);
      }
    }
  );
};

exports.magmaVersionsMethod = (cb) => {
  request.get(
    "https://api.magmafoundation.org/api/v2/allVersions",
    options,
    (error, res, body) => {
      if (error) {
        return console.log(error);
      }

      if (!error && res.statusCode == 200) {
        body = JSON.parse(body);
        cb(body);
      }
    }
  );
};

exports.purpurVersionsMethod = (cb) => {
  var jsona = [];
  request.get(
    "https://api.purpurmc.org/v2/purpur/",
    options,
    (error, res, body) => {
      if (error) {
        return console.log(error);
      }

      if (!error && res.statusCode == 200) {
        body = JSON.parse(body);
        jsona = body.versions;
        jsona.reverse();
        cb(jsona);
      }
    }
  );
};

exports.externalURLVersionsMethod = (url, cb) => {
  var jsona = [];
  request.get(url, options, (error, res, body) => {
    if (error) {
      return console.log(error);
    }

    if (!error && res.statusCode == 200) {
      body = JSON.parse(body);
      for (const [key, value] of Object.entries(body)) {
        jsona.push(key);
      }
      cb(jsona);
    }
  });
};