var trackDownloadTasks_enabled = false;
var trackDownloadTasks_filename = "";

var trackDownloadTasks2_enabled = false;
var trackDownloadTasks2_filename = "";
var trackDownloadTasks2_type = "";
var trackDownloadTasks2_completed = false;

var trackJavaUnpack_enabled = false;

var snameRegex = /^[a-zA-Z0-9_.-]*$/gm;

var selectedCore_type = "";
var selectedCore_version = "";
var selectedCore_filename = "";

var sv_port = "";
var sv_onmode = "";

var javaOptimizeString =
  "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=15";

$(document).ready(function () {
  $("#new-server-wizard-drawer input[type=text]").each(function () {
    $(this).val("");
  });
  $("#new-server-wizard-drawer #core-brands").prop("selectedIndex", 0);
  $("#new-server-wizard-drawer #core-versions").addClass("hidden");
  $("#new-server-wizard-drawer #g-core-input").val("");
  $("#new-server-wizard-drawer #g-core-input")[0].value = "";

  $("#new-server-wizard-drawer input:not(#xmx), #new-server-wizard-drawer textarea").keyup(function () {
    checkAllInputs();
  });

  $("#core-brands").change(function () {
    checkAllInputs();
    val = $("#core-brands option:selected").val();
    if (val != "own") {
      $("#core-versions").removeClass("hidden");
      $("#g-core-input").addClass("hidden");
      loadCores(val);
    } else {
      $("#core-versions").addClass("hidden");
      $("#g-core-input").removeClass("hidden");
    }
    selectedCore_type = val;
  });

  $("#core-versions").change(function () {
    checkAllInputs();
    val = $("#core-versions option:selected").val();
    $.get("/kubek/verToJava?version=" + val, function (jv) {
      $("#new-server-wizard-drawer .req-java").text(
        "{{recomm-java-msg-sw}} " + jv
      );
    });
    selectedCore_version = val;
  });

  $("#g-core-input").change(function () {
    fn = $("#g-core-input")[0]
      .value.split(/(\\|\/)/g)
      .pop();
    selectedCore_filename = fn;
    det = detectServerVersion(fn);
    if (det != null) {
      selectedCore_version = det[0].replace("-", "").trim();
      $("#srv-ver-detected").html(
        "<span style='color: gray;'>{{lookslike-ver-sw}}</span>" +
          selectedCore_version
      );
      $("#srv-ver-detected").data("ver", selectedCore_version);
      $("#srv-ver-detected").show();
    } else {
      selectedCore_version = null;
    }

    $.get("/kubek/verToJava?version=" + selectedCore_version, function (jv) {
      $("#new-server-wizard-drawer .req-java").text(
        "{{recomm-java-msg-sw}} " + jv
      );
      checkAllInputs();
    });
  });

  $("#xmx").change(function () {  
    if ($(this).val() > parseInt($(this).attr("max"))) {
      $(this).val(parseInt($(this).attr("max")));
    }
    if ($(this).val() < $(this).attr("min")) {
      $(this).val($(this).attr("min"));
    }
    checkAllInputs();
    generateJavaStartup();
  });

  $.get("/kubek/usage", function (usage) {
    total = round512(Math.round(usage.totalmem / 1024 / 1024));
    ttl = (total / 1024).toFixed(1) / 2;
    max = (total / 1024).toFixed(1);
    $("#xmx").val(ttl);
    $("#xmx").attr("max", max);
    generateJavaStartup();
  });

  $("#serverport").val(25565);

  $.get("/kubek/javaVersions", function (jv) {
    if (selectedCore_version != null) {
      $("#java-vers").append(
        '<option value="usedetect">{{use-compat-java-auto-sw}}</option>'
      );
    }
    jv.forEach(function (jfile) {
      $("#java-vers").append(
        '<option value="' + jfile + '">' + jfile + "</option>"
      );
    });

    if ($("#java-vers").length > 1) {
      $("#java-vers option").eq(1).prop("selected", true);
    } else {
      $("#java-vers option").eq(0).prop("selected", true);
    }
    generateJavaStartup();
  });

  checkAllInputs();
});

function checkAllInputs() {
  check_1 = false;
  check_1_items = 0;
  check_2 = false;
  check_3 = false;
  check_4_items = 0;
  check_4 = false;
  all_checks = false;

  $(
    "#new-server-wizard-drawer input[type=text], #new-server-wizard-drawer input[type=number]"
  ).each(function () {
    if ($(this).val() != "") {
      check_1_items++;
    }
  });
  if (
    check_1_items ==
    $(
      "#new-server-wizard-drawer input[type=text], #new-server-wizard-drawer input[type=number]"
    ).length
  ) {
    check_1 = true;
  }

  if (
    $("#new-server-wizard-drawer #core-brands option:selected").val() == "own"
  ) {
    if ($("#new-server-wizard-drawer #g-core-input")[0].value != "") {
      check_2 = true;
    }
  } else {
    check_2 = true;
  }

  if (
    $("#new-server-wizard-drawer #core-brands option:selected").val() ==
    "Выберите ядро"
  ) {
    check_2 = false;
  }

  if ($("#new-server-wizard-drawer #fsc").val() != "") {
    check_3 = true;
  }

  text = $("#server-name-input").val();
  if (
    text.length >= 2 &&
    text.length <= 32 &&
    text.match(snameRegex) !== "undefined" &&
    text.match(snameRegex) != null
  ) {
    check_4 = true;
  }

  if (
    check_1 == true &&
    check_2 == true &&
    check_3 == true &&
    check_4 == true
  ) {
    all_checks = true;
  }
  if (all_checks == true) {
    $("#new-server-wizard-drawer button.bg-blue-700").removeClass("hidden");
    $("#new-server-wizard-drawer button.disabled-btn").addClass("hidden");
  } else {
    $("#new-server-wizard-drawer button.bg-blue-700").addClass("hidden");
    $("#new-server-wizard-drawer button.disabled-btn").removeClass("hidden");
  }
}

function generateJavaStartup() {
  sl = "";
  sl += "-Dfile.encoding=UTF-8 ";
  sl += "-Xmx" + Math.round($("#xmx").val() * 1024) + "M";
  sl += " ";
  if ($("#javaOptiflagsCheckbox").is(":checked")) {
    sl += javaOptimizeString;
    sl += " ";
  }
  sl += "-jar";
  $("#fsc").val(sl);
}

function createServerV2() {
  if (
    $("#fsc").val() != "" &&
    $("#server-name-input").val() != "" &&
    $("#xmx").val() != "" &&
    $("#serverport").val() != ""
  ) {
    serverName = $("#server-name-input").val();
    onlineMode = $("#onlinemodeCheckbox").is(":checked");
    port = $("#serverport").val();
    sv_port = port;
    sv_onmode = onlineMode;
    $("#new-server-wizard-drawer .main-form").addClass("hidden");
    $("#new-server-wizard-drawer #drawer-label").addClass("hidden");
    $("#new-server-wizard-drawer button.text-gray-400.bg-transparent").addClass(
      "hidden"
    );
    $("#progress-card").removeClass("hidden");
    $("#progress-card .progress").hide();
    $("#progress-card p").html("{{search-core-sw}}");
    if (selectedCore_type == "paper" || selectedCore_type == "spigot") {
      $.get(
        "/cores/" +
          selectedCore_type +
          "/search?core=" +
          selectedCore_type.charAt(0).toUpperCase() +
          selectedCore_type.slice(1) +
          " " +
          $("#core-versions option:selected").val(),
        function (data) {
          if (data != "") {
            $("#progress-card p").html("{{down-core-sw}}");
            $.get(
              "/downloader/download?url=" +
                data +
                "&server=" +
                serverName +
                "&filename=" +
                data.substring(data.lastIndexOf("/") + 1) +
                "&type=core"
            );
            trackDownloadTasks_enabled = true;
            trackDownloadTasks_filename = data.substring(
              data.lastIndexOf("/") + 1
            );
          }
        }
      );
    } else if (selectedCore_type == "own") {
      var formData = new FormData($("#g-core-form")[0]);
      jQuery.ajax({
        url: "/upload/core?server=" + serverName,
        type: "POST",
        data: formData,
        success: function (data) {
          $("#progress-card .progress").hide();

          if (selectedCore_filename.match(/forge.*-installer/gim) != null) {
            trackDownloadTasks2_type = "forge";
            $("#progress-card .progress").hide();
            $("#progress-card p").html("{{forge-ins-text-sw}}");
            $("#progress-card #forgeins").show();
            $("#progress-card #forgeins").text("");

            $.get(
              "/forgeInstaller/start?server=" +
                encodeURI(serverName) +
                "&filename=" +
                selectedCore_filename
            );

            iint = setInterval(function () {
              if (
                !trackDownloadTasks2_completed &&
                !trackDownloadTasks2_enabled
              ) {
                $.get(
                  "/forgeInstaller/progress?server=" + encodeURI(serverName),
                  function (get) {
                    if (get != "allisok") {
                      get = get.split(/\r?\n/).slice(-100);
                      get = get.join("<br>");
                      $("#progress-card .progress").hide();
                      $("#progress-card #forgeins").html(get);
                      $("#progress-card #forgeins").scrollTop(
                        $("#progress-card #forgeins")[0].scrollHeight
                      );
                    } else {
                      $("#progress-card .progress").hide();
                      $("#progress-card #forgeins").hide();
                      $("#progress-card #forgeins").text("");

                      if (
                        $("#java-vers option:selected").val() == "usedetect"
                      ) {
                        ver = $("#srv-ver-detected").data("ver");
                        $.get(
                          "/downloader/downloadJavaForServer?serverVersion=" +
                            selectedCore_version +
                            "&server=" +
                            serverName,
                          function (ret) {
                            trackDownloadTasks2_filename = ret;
                            trackDownloadTasks2_enabled = true;
                            trackDownloadTasks2_type = "forge";
                          }
                        );
                      } else {
                        pathh = $("#java-vers option:selected").val();

                        $("#progress-card .progress").hide();
                        $("#progress-card p").html(
                          "{{unpacking-compl-java-sw}}"
                        );
                        startLine = '"' + pathh + '"' + " " + $("#fsc").val();
                        $.get(
                          "/server/completion?server=" +
                            encodeURI(serverName) +
                            "&jf=" +
                            selectedCore_filename.replace(/-installer/gm, "") +
                            "&startcmd=" +
                            btoa(startLine) +
                            "&port=" +
                            sv_port +
                            "&onMode=" +
                            sv_onmode,
                          function (data) {
                            if (data == "Success") {
                              window.localStorage.setItem(
                                "selectedServer",
                                serverName
                              );
                              window.location = "/";
                            }
                          }
                        );
                      }
                    }
                  }
                );
              }
            }, 500);
          } else {
            if ($("#java-vers option:selected").val() == "usedetect") {
              ver = $("#srv-ver-detected").data("ver");

              if (!trackDownloadTasks2_enabled) {
                $.get(
                  "/downloader/downloadJavaForServer?serverVersion=" +
                    selectedCore_version +
                    "&server=" +
                    serverName,
                  function (ret) {
                    trackDownloadTasks2_filename = ret;
                    trackDownloadTasks2_enabled = true;
                    trackDownloadTasks2_type = "other_own";
                  }
                );
              }
            } else {
              pathh = $("#java-vers option:selected").val();

              $("#progress-card .progress").hide();
              $("#progress-card p").html("{{unpacking-compl-java-sw}}");
              startLine = '"' + pathh + '"' + " " + $("#fsc").val();
              $.get(
                "/server/completion?server=" +
                  encodeURI(serverName) +
                  "&jf=" +
                  selectedCore_filename +
                  "&startcmd=" +
                  btoa(startLine) +
                  "&port=" +
                  port +
                  "&onMode=" +
                  onlineMode,
                function (data) {
                  if (data == "Success") {
                    window.localStorage.setItem("selectedServer", serverName);
                    window.location = "/";
                  }
                }
              );
            }
          }
        },
        error: function (data) {
          $("#progress-card .progress").hide();
          $("#progress-card p").html("Error: " + data.statusText);
        },
        cache: false,
        contentType: false,
        processData: false,
      });
    }
  }
}

function loadCores(core) {
  $("#core-versions").html("");
  console.log("[UI]", "Loading cores versions for " + core);
  $.get("/cores/list", function (cores) {
    crl = cores[core];
    crl.forEach((ver) => {
      $("#core-versions").append(
        "<option value='" + ver + "'>" + ver + "</option>"
      );
    });
    selectedCore_version = crl[0];
    console.log("[UI]", "Successfully loaded cores list");
  });
}

function arr_diff(a1, a2) {
  var a = [],
    diff = [];
  for (var i = 0; i < a1.length; i++) {
    a[a1[i]] = true;
  }
  for (var i = 0; i < a2.length; i++) {
    if (a[a2[i]]) {
      delete a[a2[i]];
    } else {
      a[a2[i]] = true;
    }
  }
  for (var k in a) {
    diff.push(k);
  }
  return diff;
}

function round512(x) {
  return Math.ceil(x / 512) * 512;
}

function detectServerVersion(name) {
  return name.match(/-1\.\d{1,2}(\.\d)?/gm);
}
