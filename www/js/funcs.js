// Modal functions
function showModal(id, anim, cb, bindToInput = false) {
  $("#" + id).show();
  animateCSS("#" + id + " .modal-layout", anim);
  $("#" + id + " .modal-layout .clsbtn").unbind("click");
  $("#" + id + " .modal-layout .clsbtn").click(function (e) {
    hideModal(id);
    cb(e);
  });
  if (bindToInput == true) {
    $("#" + id + " .modal-layout input")
      .eq(0)
      .focus();
    $("#" + id + " .modal-layout input").keydown(function (e) {
      if (e.key == "Enter") {
        hideModal(id);
        cb(e);
      }
    });
  }
}

function hideModal(id) {
  $("#" + id + " .modal-layout .clsbtn").unbind("click");
  $("#" + id).fadeOut(100, function () {
    $("#" + id).hide();
  });
}

function openSocket(port) {
  return io("ws://" + window.location.hostname + ":" + port);
}

// Dynamic pages control functions
function updateURLParameter(url, param, paramVal) {
  var newAdditionalURL = "";
  var tempArray = url.split("?");
  var baseURL = tempArray[0];
  var additionalURL = tempArray[1];
  var temp = "";
  if (additionalURL) {
    tempArray = additionalURL.split("&");
    for (var i = 0; i < tempArray.length; i++) {
      if (tempArray[i].split("=")[0] != param) {
        newAdditionalURL += temp + tempArray[i];
        temp = "&";
      }
    }
  }

  var rows_txt = temp + "" + param + "=" + paramVal;
  return baseURL + "?" + newAdditionalURL + rows_txt;
}

function setPageURL(page) {
  window.history.replaceState(
    "",
    "",
    updateURLParameter(window.location.href, "act", page)
  );
}

function gotoPage(page) {
  animateTopbar(25, 50);
  $.get("/auth/permissions", function (perms) {
    animateTopbar(90, 50);
    if (page == "console" && !perms.includes("console")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (page == "mods" && !perms.includes("plugins")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (page == "file_manager" && !perms.includes("filemanager")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (
      page == "server_settings" &&
      !perms.includes("server_settings")
    ) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (page == "kubek_settings" && !perms.includes("kubek_settings")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else {
      console.log("[UI]", "Trying to load page:", page);
      setPageURL(page);
      $.ajax({
        url: "/pages/" + page + ".html",
        success: function (result) {
          console.log("[UI]", "We got page content");
          $("#content-place").html(result);
          socket.emit("update", {
            type: "servers",
          });
          $("#server-name").text(window.localStorage.selectedServer);
          $("#server-icon").attr(
            "src",
            "/server/icon?server=" + window.localStorage.selectedServer
          );
          $.get("/server/type?server=" + window.localStorage.selectedServer, function(type){
            if(type == "bedrock"){
              $(".hide-on-bedrock").hide();
            }
          });
          animateTopbar(100, 50);
          setTimeout(() => {
            animateTopbar(0, 50);
          }, 200);
        },
        error: function (error) {
          console.error(
            "[UI]",
            "Error happend when loading page:",
            error.status,
            error.statusText
          );
          animateTopbar(0, 15);
          gotoPage("console");
        },
      });
      setUnactiveTabMenu();
      setActiveTabMenuByPage(page);
    }
  });
}

// Topbar function
function animateTopbar(percent, time) {
  $("#topbar div").stop();
  $("#topbar div").animate({ width: percent + "%" }, time);
}

// User logout function
function logoutUser() {
  window.location = "/auth/logout";
}

// Server controls functions
function startServer() {
  $.get("/server/start?server=" + window.localStorage.selectedServer);
}

function stopServer() {
  showModal("stop-server-modal", "fadeIn", function () {
    $.get("/server/statuses", function (sstat) {
      if (
        typeof sstat[window.localStorage.selectedServer] !== "undefined" &&
        typeof sstat[window.localStorage.selectedServer]["stopCommand"] !==
          "undefined"
      ) {
        $.get(
          "/server/sendCommand?server=" +
            window.localStorage.selectedServer +
            "&cmd=" +
            sstat[window.localStorage.selectedServer]["stopCommand"]
        );
      } else {
        $.get(
          "/server/sendCommand?server=" +
            window.localStorage.selectedServer +
            "&cmd=stop"
        );
      }
    });
  });
}

function restartServer() {
  showModal("restart-server-modal", "fadeIn", function () {
    $.get("/server/restart?server=" + window.localStorage.selectedServer);
  });
}

function killServer() {
  showModal("kill-server-modal", "fadeIn", function () {
    $.get("/server/kill?server=" + window.localStorage.selectedServer);
  });
}