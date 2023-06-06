function updateMemoryAndCPUUsage_ui(data) {
  if (
    data.cpu != NaN &&
    data.cpu != "undefined" &&
    data.totalmem != NaN &&
    data.totalmem != "undefined" &&
    $("#cpu-block .percent").length > 0
  ) {
    memTotal = (data.totalmem / 1024 / 1024 / 1024).toFixed(1) + " GB";
    memUsed = (data.usedmem / 1024 / 1024 / 1024).toFixed(1) + " GB";
    memPercent = Math.round((data.usedmem / data.totalmem) * 100);
    $("#cpu-block .percent").text(data.cpu + "%");
    $("#cpu-block .progress div div").css("width", data.cpu + "%");
    $("#ram-block .percent").html(
      memUsed + ' <span class="text-sm font-normal">/ ' + memTotal + "</span>"
    );
    $("#ram-block .progress div div").css("width", memPercent + "%");
    setColorBySelector_ui(
      genColorFromPercent(data.cpu),
      "#cpu-block .progress div div"
    );
    setColorBySelector_ui(
      genColorFromPercent(memPercent),
      "#ram-block .progress div div"
    );
  }
}

function setColorBySelector_ui(colorClass, selector) {
  $(selector).removeClass("bg-green-500");
  $(selector).removeClass("bg-yellow-500");
  $(selector).removeClass("bg-red-500");
  $(selector).addClass("bg-" + colorClass);
}

function genColorFromPercent(percent) {
  if (percent < 60) {
    return "green-500";
  } else if (percent >= 60 && percent < 80) {
    return "yellow-500";
  } else {
    return "red-500";
  }
}

function updateServersStatuses_ui(data) {
  if (
    window.localStorage.selectedServer != null &&
    typeof data[window.localStorage.selectedServer] !== "undefined" &&
    typeof data[window.localStorage.selectedServer].status !== "undefined" &&
    $("#status-text").length > 0
  ) {
    if (data[window.localStorage.selectedServer].status == "stopped") {
      $("#status-text").html("{{status-stopped}}");
      $("#status-text").removeClass();
      $("#status-text").addClass(
        "dark:bg-red-900 dark:text-red-300 bg-red-100 text-red-800 ml-3 text-sm font-medium mr-2 px-2.5 py-0.5 rounded"
      );
      $("#server-start-btn").show();
      $("#server-kill-btn").hide();
      $("#server-stop-btn").hide();
      $("#server-restart-btn").hide();
    } else if (data[window.localStorage.selectedServer].status == "started") {
      $("#status-text").html("{{status-started}}");
      $("#status-text").removeClass();
      $("#status-text").addClass(
        "dark:bg-green-900 dark:text-green-300 bg-green-100 text-green-800 ml-3 text-sm font-medium mr-2 px-2.5 py-0.5 rounded"
      );
      $("#server-start-btn").hide();
      $("#server-kill-btn").show();
      $("#server-stop-btn").show();
      $("#server-restart-btn").show();
    } else if (data[window.localStorage.selectedServer].status == "starting") {
      $("#status-text").html("{{status-starting}}");
      $("#status-text").removeClass();
      $("#status-text").addClass(
        "dark:bg-yellow-900 dark:text-yellow-300 bg-yellow-100 text-yellow-800 ml-3 text-sm font-medium mr-2 px-2.5 py-0.5 rounded"
      );
      $("#server-start-btn").hide();
      $("#server-kill-btn").show();
      $("#server-stop-btn").hide();
      $("#server-restart-btn").hide();
    } else if (data[window.localStorage.selectedServer].status == "stopping") {
      $("#status-text").html("{{status-stopping}}");
      $("#status-text").removeClass();
      $("#status-text").addClass(
        "dark:bg-yellow-900 dark:text-yellow-300 bg-yellow-100 text-yellow-800 ml-3 text-sm font-medium mr-2 px-2.5 py-0.5 rounded"
      );
      $("#server-start-btn").hide();
      $("#server-kill-btn").show();
      $("#server-stop-btn").hide();
    }
    updateServersDropdownList(function () {}, data);
  }
}

function updateServersDropdownList_ui(preparedData, cbf) {
  $("#servers-list li").unbind("click");
  $("#servers-list ul").html("");
  for (const [key, value] of Object.entries(preparedData)) {
    clr = "text-black dark:text-white";
    switch (value.status) {
      case "stopped":
        clr = "text-red-500";
        break;
      case "started":
        clr = "text-green-500";
        break;
      case "starting":
        clr = "text-yellow-500";
        break;
      case "stopping":
        clr = "text-yellow-500";
        break;
    }
    $("#servers-list ul").prepend(
      SERVERS_LIST_ITEM_BASE.replace(
        /\$1/gim,
        '<img src="/server/icon?server=' + key + '" style="height: 24px;">'
      )
        .replace(/\$2/gim, "<span class='server-name'>" + key + "</span>")
        .replace(
          /\$3/gim,
          "<span class='" + clr + "'>" + value["statusTranslated"] + "</span>"
        )
    );
  }
  $("#servers-list li").click(function () {
    serverName = $(this).find(".server-name").text();
    window.localStorage.setItem("selectedServer", serverName);
    window.location.reload();
  });

  if ($("#servers-list li").length == 0) {
    $("#status-text").hide();
    $("#logout-button").hide();
    $("#menu-tabs-list").hide();
    $("#edit-server-button").hide();
    $("#servers-list-dropdown").hide();
    $("#new-server-button").addClass("animate__animated animate__heartBeat");
    gotoPage("welcome");
  }
  cbf();
}

function updateServersDropdownList(cb, preparedData = null) {
  if (preparedData != null) {
    updateServersDropdownList_ui(preparedData, function () {
      cb();
    });
  } else {
    $.get("/server/statuses", function (data) {
      updateServersDropdownList_ui(data, function () {
        cb();
      });
    });
  }
}

function updateServerDataFromQuery_ui(data) {
  $("#server-ver-block .percent").text(data.version.name);
  $("#players-block .percent").html(
    data.players.online +
      ' <span class="text-sm font-normal">/ ' +
      data.players.max +
      "</span>"
  );
}

function afterSocketHandshake() {
  memoryUpdInterval = setInterval(function () {
    socket.emit("update", {
      type: "usage",
    });
  }, 3000);
  console.log("[WS]", "Setup`ed 'memory' update interval");

  consoleUpdInterval = setInterval(function () {
    if (
      $("#status-text").text() != "{{status-stopped}}" &&
      $("#autoupdateConsoleCheckbox").length != 0 &&
      $("#autoupdateConsoleCheckbox").is(":checked") == true
    ) {
      socket.emit("update", {
        type: "console",
      });
    }
  }, 6000);
  console.log("[WS]", "Setup`ed 'console' update interval");

  queryUpdInterval = setInterval(function () {
    updateQuery_socket();
  }, 6000);
  console.log("[WS]", "Setup`ed 'query' update interval");

  socket.emit("update", {
    type: "usage",
  });
  setTimeout(updateQuery_socket, 1200);
  socket.emit("update", {
    type: "servers",
  });
}

function updateQuery_socket() {
  if ($("#status-text").text() == "{{status-started}}") {
    socket.emit("update", {
      type: "query",
      server: window.localStorage.selectedServer,
    });
  } else {
    $("#server-ver-block .percent").text("{{unknown}}");
    $("#players-block .percent").text("{{unknown}}");
  }
}

// Notifications presets
function showDisconnectNotify() {
  Toaster("{{disconnect-notify}}", 3000, false, "error");
}

function showReconnectNotify() {
  Toaster("{{reconnect-notify}}", 3000, false, "success");
}

function updateIsReady() {
  Toaster("{{newupdate-installed}}", 5000, false, "success", true);
}

function changeServerIcon() {
  $("#g-img-input").trigger("click");
  $("#g-img-input").off("change");
}

// Refresh UI functions
function refreshSimplify() {
  if (typeof window.localStorage.simplify !== "undefined") {
    if (window.localStorage.simplify == "true") {
      $("html").addClass("simplify");
    } else {
      $("html").removeClass("simplify");
    }
  } else {
    window.localStorage.setItem("simplify", "false");
    $("html").removeClass("simplify");
  }
}

function refreshNoRounded() {
  if (typeof window.localStorage.norounded !== "undefined") {
    if (window.localStorage.norounded == "true") {
      $("html").addClass("norounded");
    } else {
      $("html").removeClass("norounded");
    }
  } else {
    window.localStorage.setItem("norounded", "false");
    $("html").removeClass("norounded");
  }
}

function refreshNoBackdrop() {
  if (typeof window.localStorage.nobackdrop !== "undefined") {
    if (window.localStorage.nobackdrop == "true") {
      $("html").addClass("nobackdrop");
    } else {
      $("html").removeClass("nobackdrop");
    }
  } else {
    window.localStorage.setItem("nobackdrop", "false");
    $("html").removeClass("nobackdrop");
  }
}

function refreshBackgroundImage() {
  if (typeof window.localStorage.background !== "undefined") {
    $("#blurry-bg-img-" + window.localStorage.background).show();
  } else {
    window.localStorage.setItem("background", "1");
    $("#blurry-bg-img-1").show();
  }
}

function refreshBlurRange() {
  if (typeof window.localStorage.blurrange !== "undefined") {
    $(".blurry-bg-img").each(function () {
      if ($(this).css("display") == "none") {
        $(this).attr(
          "style",
          "display: none; filter: blur(" +
            window.localStorage.blurrange +
            "px) !important;"
        );
      } else {
        $(this).attr(
          "style",
          "filter: blur(" + window.localStorage.blurrange + "px) !important;"
        );
      }
    });
  } else {
    window.localStorage.setItem("blurrange", "24");
  }
}

function refreshToastsPosition(){
  if (typeof window.localStorage.toastspos !== "undefined") {
    $("#toasts-list").removeClass("left-top right-top left-bottom right-bottom top-center bottom-center");
    $("#toasts-list").addClass(window.localStorage.toastspos);
  } else {
    window.localStorage.setItem("toastspos", "left-bottom");
    $("#toasts-list").addClass("left-bottom");
  }
}

function refreshFont() {
  if (typeof window.localStorage.fontfamily !== "undefined") {
    $("html").removeClass("inter sansserif segoeui consolas verdana");
    $("html").addClass(window.localStorage.fontfamily);
  } else {
    window.localStorage.setItem("fontfamily", "inter");
  }
}

function refreshAllUI(){
  refreshSimplify();
  refreshNoRounded();
  refreshNoBackdrop();
  refreshBackgroundImage();
  refreshBlurRange();
  refreshToastsPosition();
  refreshFont();
}

// Tab menu functions
function setUnactiveTabMenu() {
  addel = $("#menu-tabs-list li button.active");
  $(addel).removeClass();
  $(addel).addClass(
    "inline-flex p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group"
  );
}

function setActiveTabMenuByElement(elem) {
  $(elem).removeClass();
  $(elem).addClass(
    "active inline-flex p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500 group"
  );
}

function setActiveTabMenuByPage(pg) {
  $("#menu-tabs-list li button").each(function () {
    if ($(this).data("page") == pg) {
      $(this).removeClass();
      $(this).addClass(
        "active inline-flex p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500 group"
      );
    }
  });
}
