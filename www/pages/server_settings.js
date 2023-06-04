startScript_save = "";

$(document).ready(function () {
  cs = false;
  $.get(
    "/server/getStartScript?server=" + window.localStorage.selectedServer,
    function (data) {
      javaPath = data.toString().substring(1, data.length);
      javaPath = javaPath.substring(0, javaPath.search('"'));
      startScript_save = data
        .toString()
        .substring(1, data.length)
        .replace(javaPath, "")
        .trim();
      $.get("/kubek/javaVersions", function (jv) {
        jv.forEach(function (jfile, i) {
          active = "";
          if (jfile == javaPath) {
            active = " checked";
          }
          $("#java-versions-radios").append(
            '<div class="flex items-center mb-2"><input class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600" type="radio"' +
              active +
              ' name="javaRadios" id="javaRadio-' +
              i +
              '" /><label class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300" for="javaRadio-' +
              i +
              '"> ' +
              jfile +
              " </label></div>"
          );
        });
      });
      $.get(
        "/downloader/getPathToJava?server=" +
          window.localStorage.selectedServer,
        function (ret) {
          if (ret != false) {
            active = "";
            if (ret == javaPath) {
              active = " checked";
            }
            $("#java-versions-radios").append(
              '<div class="flex items-center mb-2"><input class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600" type="radio"' +
                active +
                ' name="javaRadios" id="javaRadio-' +
                $("#java-versions-radios .radio").length +
                '" /><label class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300" for="javaRadio-' +
                $("#java-versions-radios .radio").length +
                '"> ' +
                ret +
                "</label></div>"
            );
          }
        }
      );
      $.get("/server/statuses", function (sstat) {
        if (
          typeof sstat[window.localStorage.selectedServer] !== "undefined" &&
          typeof sstat[window.localStorage.selectedServer]["stopCommand"] !==
            "undefined"
        ) {
          $("#stopcmd-input").val(
            sstat[window.localStorage.selectedServer]["stopCommand"]
          );
        } else {
          $("#stopcmd-input").val("stop");
        }
        if (
          typeof sstat[window.localStorage.selectedServer] !== "undefined" &&
          typeof sstat[window.localStorage.selectedServer][
            "restartScheduler"
          ] !== "undefined"
        ) {
          if (
            sstat[window.localStorage.selectedServer]["restartScheduler"][
              "enabled"
            ] == "true"
          ) {
            $("#resschd-enabled-switch").attr("checked", true);
          }
          $("#resschd-crontab-input").val(
            sstat[window.localStorage.selectedServer]["restartScheduler"][
              "crontab"
            ]
          );
        } else {
          $("#resschd-crontab-input").val("* * * * *");
        }
      });
    }
  );

  $("#delete-sname").val("");
  $("#delete-button").click(function () {
    if ($("#delete-sname").val() == window.localStorage.selectedServer) {
      deleteServer();
    }
  });
  $("#delete-sname").keyup(function () {
    if ($(this).val() == window.localStorage.selectedServer) {
      $("#delete-button").removeAttr("disabled");
    } else {
      $("#delete-button").attr("disabled", true);
    }
  });
  $("#resschd-enabled-switch").change(function () {
    if (!$(this).is(":checked")) {
      $("#resschd-crontab-input").prop("disabled", true);
    } else {
      $("#resschd-crontab-input").prop("disabled", false);
    }
  });
});

function deleteServer() {
  Toastify({
    text: "{{do-not-reload-page}}!",
    duration: 3000,
    newWindow: true,
    close: false,
    gravity: "bottom",
    position: "left",
    stopOnFocus: true,
    style: {
      background: "#0067f4",
      color: "white",
    },
    onClick: function () {},
  }).showToast();
  $.get(
    "/server/delete?server=" + window.localStorage.selectedServer,
    function () {
      window.localStorage.removeItem("selectedServer");
      window.location = "/";
    }
  );
}

function saveServerSettings() {
  script =
    '"' +
    $("#java-versions-radios input:checked")
      .next()
      .text()
      .trim()
      .replace('"', "") +
    startScript_save;

  if ($("#resschd-crontab-input").val() != null) {
    $.get(
      "/server/saveRestartScheduler?server=" +
        window.localStorage.selectedServer +
        "&enabled=" +
        $("#resschd-enabled-switch").is(":checked") +
        "&crontab=" +
        encodeURI($("#resschd-crontab-input").val()),
      function () {
        if ($("#stopcmd-input").val() != null) {
          $.get(
            "/server/saveStopCommand?server=" +
              window.localStorage.selectedServer +
              "&cmd=" +
              encodeURI($("#stopcmd-input").val()),
            function () {
              $.get(
                "/server/saveStartScript?server=" +
                  window.localStorage.selectedServer +
                  "&script=" +
                  btoa(script) +
                  "&resonerr=" +
                  $("#resOnErrCheckbox").is(":checked"),
                function () {
                  window.location.reload();
                }
              );
            }
          );
        }
      }
    );
  }
}
