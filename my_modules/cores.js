const request = require("request");
var options = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows; U; Windows NT 6.1) AppleWebKit/533.41.6 (KHTML, like Gecko) Version/4.0 Safari/533.41.6",
  },
};

exports.getCoreURL = (core, cb) => {
  core_ver = core.split(" ")[1];
  core_name = core.split(" ")[0];
  if (core_name == "Paper") {
    request.get(
      "https://papermc.io/api/v2/projects/paper/versions/" + core_ver,
      options,
      (error, res, body) => {
        if (error) {
          console.log(error);
        }

        if (!error && res.statusCode == 200) {
          jsn = JSON.parse(body);
          lastbuild = Math.max.apply(null, jsn.builds);
          request.get(
            "https://papermc.io/api/v2/projects/paper/versions/" +
              core_ver +
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
                  "https://papermc.io/api/v2/projects/paper/versions/" +
                  core_ver +
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
  }
};

exports.getPaperCores = (cb) => {
  var jsona = [];
  request.get(
    "https://papermc.io/api/v2/projects/paper",
    options,
    (error, res, body) => {
      if (error) {
        return console.log(error);
      }

      if (!error && res.statusCode == 200) {
        coreName = "Paper";
        body = JSON.parse(body);
        body.versions.forEach((version) => {
          jsona.push(coreName + " " + version.split("-")[0]);
        });
        cb(jsona);
      }
    }
  );
};

exports.getSpigotCores = (cb) => {
  request.get(
    "https://seeroy.github.io/spigots.json",
    options,
    (error, res, body) => {
      if (error) {
        return console.log(error);
      }

      if (!error && res.statusCode == 200) {
        cb(JSON.parse(body));
      }
    }
  );
};
