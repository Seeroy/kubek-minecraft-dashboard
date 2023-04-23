startScript_save = "";

$(document).ready(function () {
  cs = false;
  refreshServerProperties();
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
            '<div class="radio"><input class="kbk-radio" type="radio"' +
              active +
              ' name="javaRadios" id="javaRadio-' +
              i +
              '" /><label for="javaRadio-' +
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
              '<div class="radio"><input class="kbk-radio" type="radio"' +
                active +
                ' name="javaRadios" id="javaRadio-' +
                $("#java-versions-radios .radio").length +
                '" /><label for="javaRadio-' +
                $("#java-versions-radios .radio").length +
                '"> ' +
                ret +
                " </label></div>"
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

  $("#stopcmd-input").keyup(function () {
    if ($(this).val().trim() != "") {
      $("#stopcmd-save-button").removeAttr("disabled");
    } else {
      $("#stopcmd-save-button").attr("disabled", true);
    }
  });
  $("#stopcmd-save-button").click(function () {
    if ($("#stopcmd-input").val() != null) {
      $.get(
        "/server/saveStopCommand?server=" +
          window.localStorage.selectedServer +
          "&cmd=" +
          encodeURI($("#stopcmd-input").val()),
        location.reload
      );
    }
  });
  $("#resschd-save-button").click(function () {
    if ($("#resschd-crontab-input").val() != null) {
      $.get(
        "/server/saveRestartScheduler?server=" +
          window.localStorage.selectedServer +
          "&enabled=" +
          $("#resschd-enabled-switch").is(":checked") +
          "&crontab=" +
          encodeURI($("#resschd-crontab-input").val()),
        location.reload
      );
    }
  });
});

function deleteServer() {
  Swal.fire({
    title:
      "<span style='font-weight: 600; font-size: 16pt;'>{{removing}} " +
      window.localStorage.selectedServer +
      "...</span><br><span style='font-weight: 400; font-size: 15pt;'>{{do-not-reload-page}}!</span>",
    html: '<div style="display: flex; justify-content: center;"><div style="width: 48px; height: 48px; border-radius: 50%; background: #0067f4;" class="animate__animated animate__fadeIn animate__infinite"></div></div>',
    showCancelButton: false,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
  });
  $.get(
    "/server/delete?server=" + window.localStorage.selectedServer,
    function () {
      window.localStorage.removeItem("selectedServer");
      window.location = "/";
    }
  );
}

function getSPTranslate(cb) {
  $.get("/kubek/getSPTranslate", function (data) {
    cb(data);
  });
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
  $.get(
    "/server/saveStartScript?server=" +
      window.localStorage.selectedServer +
      "&script=" +
      btoa(script) +
      "&resonerr=" +
      $("#resOnErrCheckbox").is(":checked"),
    location.reload
  );
}

function refreshServerProperties() {
  getSPTranslate(function (spt) {
    $.get(
      "/server/getServerPropertiesFile?server=" +
        window.localStorage.selectedServer,
      function (data) {
        keys = Object.keys(data);
        fulls = data;
        keys.forEach(function (key, i) {
          if (key != "generator-settings") {
            if (typeof spt[key] !== "undefined") {
              tooltip =
                '<span class="material-symbols-outlined addtooltip ms-3" data-mdb-toggle="tooltip" data-mdb-placement="right" data-mdb-html="true" title="' +
                spt[key] +
                '">info</span>';
            } else {
              tooltip = "";
            }
            znach = fulls[key];
            if (typeof znach == "object") {
              znach = JSON.stringify(znach).replace("null", "").trim();
            }

            if (typeof znach == "boolean") {
              if (znach == true) {
                checkd = " checked";
              } else {
                checkd = "";
              }
              $("#speditor-pills .container_sp").append(
                '<div class="ttc ttbb d-flex flex-row align-items-center" data-type="switch"><label class="switch cbox"><input type="checkbox" id="ct' +
                  i +
                  '" name="ct' +
                  i +
                  '"' +
                  checkd +
                  '><span class="slider round"></span></label><span class="ms-2 key">' +
                  key +
                  "</span>" +
                  tooltip +
                  "</div>"
              );
            } else {
              if (key == "difficulty") {
                r = ["hard", "medium", "easy", "peaceful"];
                c = "";
                r.forEach(function (diff) {
                  if (diff == znach) {
                    c = c + "<option selected>" + diff + "</option>";
                  } else {
                    c = c + "<option>" + diff + "</option>";
                  }
                });
                $("#speditor-pills .container_sp").append(
                  '<div class="ttc ttbb" data-type="text"><div class="ttcc"><select class="kbk-input" style="width: 256px;">' +
                    c +
                    '</select></div><div class="ttcc"><span>' +
                    key +
                    "</span></div>" +
                    tooltip +
                    "</div>"
                );
              } else if (key == "gamemode") {
                r = ["adventure", "survival", "creative"];
                c = "";
                r.forEach(function (diff) {
                  if (diff == znach) {
                    c = c + "<option selected>" + diff + "</option>";
                  } else {
                    c = c + "<option>" + diff + "</option>";
                  }
                });
                $("#speditor-pills .container_sp").append(
                  '<div class="ttc ttbb" data-type="text"><div class="ttcc"><select class="kbk-input" style="width: 256px;">' +
                    c +
                    '</select></div><div class="ttcc"><span>' +
                    key +
                    "</span></div>" +
                    tooltip +
                    "</div>"
                );
              } else {
                if (znach != null) {
                  $("#speditor-pills .container_sp").append(
                    '<div class="ttc ttbb" data-type="text"><div class="ttcc"><input type="text" style="width: 256px" class="kbk-input" value="' +
                      znach +
                      '"></div><div class="ttcc"><span>' +
                      key +
                      "</span></div>" +
                      tooltip +
                      "</div>"
                  );
                } else {
                  $("#speditor-pills .container_sp").append(
                    '<div class="ttc ttbb" data-type="text"><div class="ttcc"><input type="text" style="width: 256px" class="kbk-input" value=""></div><div class="ttcc"><span>' +
                      key +
                      "</span></div>" +
                      tooltip +
                      "</div>"
                  );
                }
              }
            }
          }
        });
        $(".addtooltip").each(function () {
          new mdb.Tooltip(this);
        });
      }
    );
  });
}

function saveProps() {
  var sp = "";
  $(".ttbb").each(function () {
    if ($(this).data("type") == "switch") {
      chk = $(this).find("input").is(":checked") ? true : false;
      key = $(this).find(".key").html();
      if (sp !== "") {
        sp = sp + "\n" + key + "=" + chk;
      } else {
        sp = key + "=" + chk;
      }
    } else {
      value = $(this).find("input").val();
      key = $(this).find("span").html();
      if (key == "difficulty" || key == "gamemode") {
        value = $(this).find("select option:selected").text();
      }
      sp = sp + "\n" + key + "=" + value;
    }
  });
  sp = sp.trim();
  $.get(
    "/server/saveServerPropertiesFile?doc=" +
      encodeURIComponent(sp) +
      "&server=" +
      window.localStorage.selectedServer
  );
  Toastify({
    text: "{{settings-saved}}",
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
}
