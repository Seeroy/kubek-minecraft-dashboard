// Theme switch button script (DISCONTINUED)
/*$(document).ready(function () {
  if (
    localStorage.getItem("currentTheme") === "dark" ||
    (!("currentTheme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  var themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
  var themeToggleLightIcon = document.getElementById("theme-toggle-light-icon");

  if (
    localStorage.getItem("currentTheme") === "dark" ||
    (!("currentTheme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    themeToggleLightIcon.classList.remove("hidden");
  } else {
    themeToggleDarkIcon.classList.remove("hidden");
  }

  var themeToggleBtn = document.getElementById("theme-toggle");

  themeToggleBtn.addEventListener("click", function () {
    themeToggleDarkIcon.classList.toggle("hidden");
    themeToggleLightIcon.classList.toggle("hidden");
    if (localStorage.getItem("currentTheme")) {
      if (localStorage.getItem("currentTheme") === "light") {
        document.documentElement.classList.add("dark");
        localStorage.setItem("currentTheme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("currentTheme", "light");
      }
    } else {
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("currentTheme", "light");
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("currentTheme", "dark");
      }
    }
  });
});*/

// Main script
console.log("[UI] Starting Kubek UI...");
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
act = urlParams.get("act");
var selectedServer = "";
var socket = "";
var cs = true;
var connect_socket_error = false;
var old_bl_upd = 10;

$(document).ready(function () {
  refreshAllUI();
  if (window.localStorage.noupdatenotify == null) {
    window.localStorage.setItem("noupdatenotify", "false");
  }
  if (window.localStorage.nolowpriority == null) {
    window.localStorage.setItem("nolowpriority", "false");
  }
  $(".icon-changer img").attr(
    "src",
    "/server/icon?server=" + window.localStorage.selectedServer
  );

  $.get(
    "/server/getServerPropertiesFile?server=" +
      window.localStorage.selectedServer,
    function (data) {
      if (typeof data["motd"] !== "undefined") {
        $("#serverNameModalEdit").val(data["motd"]);
      }
    }
  );

  if ($("#g-img-input")[0].value != "") {
    var formData = new FormData($("#g-img-form")[0]);
    jQuery.ajax({
      url: "/upload/icon?server=" + window.localStorage.selectedServer,
      type: "POST",
      data: formData,
      success: function (data) {
        window.location.reload();
      },
      error: function (data) {
        Toaster("{{error-upload}}", 3000, false, "error");
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  }

  $("#language-dropdown li").click(function () {
    newlang = $(this).data("lang");
    $.get("/kubek/config", function (data) {
      data["lang"] = newlang;
      $.get(
        "/kubek/saveConfig?data=" + encodeURI(JSON.stringify(data)),
        function (data) {
          location.reload();
        }
      );
    });
  });
  $.get("/auth/permissions", function (perms) {
    $("#menu-tabs-list li button").each(function (i, item) {
      perm = $(item).data("perm");
      if (typeof perm !== "undefined" && !perms.includes(perm)) {
        parent = $(item).parent();
        $(parent).remove();
      }
    });
    $("#drawer-mobile-navigation button:not(.close-menu)").each(function (
      i,
      item
    ) {
      perm = $(item).data("perm");
      if (typeof perm !== "undefined" && !perms.includes(perm)) {
        $(item).remove();
      }
    });
  });
  $.get("/kubek/config", function (data) {
    $("#language-dropdown-btn img").attr(
      "src",
      "/assets/flags/" + data.lang + ".svg"
    );
    if (data.auth == false) {
      $("#logout-button").hide();
    }
  });

  $("#kubek-settings-button").click(function () {
    gotoPage("kubek_settings");
  });

  if (window.localStorage.noupdatenotify != "true") {
    setTimeout(function () {
      $.get("/kubek/updates/check", function (upd) {
        if (upd.found == true) {
          downloaded = upd.downloaded;
          $.get("/tasks/progress", function (tasks) {
            keys = Object.keys(tasks);
            keys.forEach(function (key) {
              value = tasks[key];
              if (
                key == "update.tmp" &&
                value == "ready" &&
                downloaded == false
              ) {
                downloaded = true;
              }
            });
            version = upd.url.split("/").pop();

            if (downloaded == false) {
              Toaster(
                "{{newupdate-found-1}}<span class='font-bold'>" +
                  version +
                  "</span><br>" +
                  "{{newupdate-found-2}}",
                5000,
                false,
                "update",
                function () {
                  Toaster(
                    "<span class='update-downloader'>{{toasts-downloading-update}} <span class='percent'></span></span>",
                    -1,
                    false,
                    "clock"
                  );
                  $.get("/kubek/updates/downloadLatest");
                },
                true
              );
            } else {
              updateIsReady();
            }
          });
        }
      });
    }, 500);
  }

  $("#menu-tabs-list li button").click(function (e) {
    if (!$(this).hasClass("active") && typeof $(this).data("page") !== "undefined") {
      if ($("#servers-list-drawer .content div.bg-gray-300").length > 0) {
        pg = $(this).data("page");
        gotoPage(pg);
      } else {
        gotoPage("welcome");
      }
    }
  });

  $("#drawer-mobile-navigation button:not(.close-menu)").click(function (e) {
    if (!$(this).hasClass("active")) {
      if ($("#servers-list-drawer .content div.bg-gray-300").length > 0) {
        pg = $(this).data("page");
        gotoPage(pg);
      } else {
        gotoPage("welcome");
      }
    }
  });

  $.get("/kubek/version", function (data) {
    $(".kbk-ver").html(data.replace("v", "").trim());
  });

  updateServersDropdownList(function () {
    if (
      typeof window.localStorage.selectedServer !== "undefined" &&
      thisServerExists(window.localStorage.selectedServer)
    ) {
      selectedServer = window.localStorage.selectedServer;
      $("#servers-list-dropdown").html(
        "<div class='flex flex-row justify-center items-center'><img src='/server/icon?server=" +
          selectedServer +
          "' style='height: 24px;' class='rounded-1'><span class='text-black dark:text-white ml-3 text-m'>" +
          selectedServer +
          "</span></div>"
      );
      if (typeof act !== "undefined" && act !== "undefined") {
        console.log("[UI]", "act is not null, trying to load", act);
        gotoPage(act, true);
      } else {
        console.log("[UI]", "act is null, loading console");
        gotoPage("console", true);
      }
    } else {
      if ($("#servers-list-drawer .content div.bg-gray-300").length > 0) {
        thiss = $("#servers-list-drawer .content div.bg-gray-300").eq(0);
        serverName = $(thiss).find(".grow").text();
        window.localStorage.setItem("selectedServer", serverName);
        window.location.reload();
      } else {
        $("#status-text").hide();
        $("#logout-button").hide();
        $("#menu-tabs-list").hide();
        $("#drawer-mobile-navigation").hide();
        $("#edit-server-button").hide();
        $("#servers-list-dropdown").hide();
        $("#new-server-button").addClass(
          "animate__animated animate__heartBeat"
        );
        gotoPage("welcome");
      }
    }
  });

  $.get("/kubek/socket-port", function (sockport) {
    socket = openSocket(sockport["port"]);
    afterSocketHandshake();
    socket.on("disconnect", () => {
      showDisconnectNotify();
      connect_socket_error = true;
    });
    socket.on("reconnect", () => {
      showReconnectNotify();
      afterSocketHandshake();
    });
    socket.on("connect_error", () => {
      showDisconnectNotify();
      connect_socket_error = true;
    });
    socket.on("handleServerError", function (arg) {
      $.get("/kubek/translate?text=" + arg.data, function (text) {
        Toaster(text, 3000, false, "error");
      });
    });
    socket.on("handleUpdate", function (arg) {
      type = arg.type;
      data = arg.data;
      switch (type) {
        case "console":
          if (
            $(".console-container").length > 0 &&
            data.server == window.localStorage.selectedServer &&
            $("#autoupdateConsoleCheckbox").is(":checked") && typeof refreshConsole == "function"
          ) {
            refreshConsole(data.data);
          }
          break;
        case "usage":
          updateMemoryAndCPUUsage_ui(data);
          break;
        case "servers":
          if (cs == false) {
            if (
              data[window.localStorage.selectedServer]["restartOnError"] ==
                true &&
              $("#resOnErrCheckbox").length > 0
            ) {
              $("#resOnErrCheckbox").prop("checked", true);
            } else {
              $("#resOnErrCheckbox").prop("checked", false);
            }
            cs = true;
          }
          updateServersStatuses_ui(data);
          break;
        case "server_status_changed":
          Toaster(data.message, 1500, false, data.type, function () {}, true);
          break;
        case "backups_list":
          if (data == "progress") {
            cur = new Date().valueOf();
            if (cur - 1000 > old_bl_upd) {
              old_bl_upd = cur;
              if ($("#backups-list").length > 0) {
                refreshBackupsList();
              }
            }
          } else {
            if ($("#backups-list").length > 0) {
              refreshBackupsList();
            }
          }
          break;
        case "query":
          updateServerDataFromQuery_ui(data);
          break;
        case "newOTP":
          if ($(".tgbot-otp").length > 0) {
            $(".tgbot-otp").val(data);
          }
          break;
        case "downloadTasks":
          keys = Object.keys(data);
          keys.forEach(function (key) {
            value = data[key];
            if (key == "update.tmp" && value != "ready") {
              $(".update-downloader .percent").text("(" + value + "%)");
            } else if (key == "update.tmp" && value == "ready") {
              $(".update-downloader").parent().parent().remove();
              updateIsReady();
            }
          });

          if (typeof ServerWizardHandlers !== "undefined") {
            ServerWizardHandlers.handleDownloadTask(data);
          }
          break;
        case "unpackingJavaArchive":
          if (typeof ServerWizardHandlers !== "undefined") {
            ServerWizardHandlers.handleUnpackingJavaArchive(data);
          }
        case "unpackingArchive":
          if (typeof ServerWizardHandlers !== "undefined") {
            ServerWizardHandlers.handleUnpackingArchive(data);
          }
      }
    });

    console.log("[UI]", "Document is ready and connection is established");
  });
});

function uploadSbrk() {
  $("#g-sbrk-input").trigger("click");
  $("#g-sbrk-input").off("change");
  $("#g-sbrk-input").change(function () {
    showModal("upload-sbrk-modal", "zoomIn");
    var formData = new FormData($("#g-sbrk-form")[0]);
    var request = new XMLHttpRequest();

    request.upload.addEventListener("progress", function (e) {
      var fileSize = document.getElementById("g-sbrk-input").files[0].size;

      if (e.loaded <= fileSize) {
        var percent = Math.round((e.loaded / fileSize) * 100);
        document.getElementById("upload-sbrk-progress").style.width =
          percent + "%";
      }

      if (e.loaded == e.total) {
        document.getElementById("upload-sbrk-progress").style.width = "100%";
        console.log("Sborka upload finished");
      }
    });

    request.open(
      "post",
      "/upload/with_progress?server=" + window.localStorage.selectedServer
    );
    request.timeout = 450000;
    request.send(formData);
  });
}

function recountServers(){
  $("#servers-count").text("(" + $("#servers-list-drawer .flex .mt-2.p-4.bg-gray-300").length + ")");
}