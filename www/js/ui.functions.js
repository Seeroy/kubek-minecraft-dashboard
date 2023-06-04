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
  if (window.localStorage.selectedServer != null && typeof data[window.localStorage.selectedServer] !== "undefined" && typeof data[window.localStorage.selectedServer].status !== "undefined" && $("#status-text").length > 0) {
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
      updateServersDropdownList(function () {});
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
      updateServersDropdownList(function () {});
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
      updateServersDropdownList(function () {});
    } else if (data[window.localStorage.selectedServer].status == "stopping") {
      $("#status-text").html("{{status-stopping}}");
      $("#status-text").removeClass();
      $("#status-text").addClass(
        "dark:bg-yellow-900 dark:text-yellow-300 bg-yellow-100 text-yellow-800 ml-3 text-sm font-medium mr-2 px-2.5 py-0.5 rounded"
      );
      $("#server-start-btn").hide();
      $("#server-kill-btn").show();
      $("#server-stop-btn").hide();
      $("#server-restart-btn").hide();
      updateServersDropdownList(function () {});
    }
  }
}

function updateServersDropdownList(cb) {
  $.get("/server/statuses", function (data) {
    $("#servers-list li").unbind("click");
    $("#servers-list ul").html("");
    for (const [key, value] of Object.entries(data)) {
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
    cb();
  });
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

function showDisconnectNotify() {
  Toastify({
    text: "{{disconnect-notify}}",
    duration: 3000,
    newWindow: true,
    close: false,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: {
      background: "#E02424",
      color: "white",
    },
    onClick: function () {},
  }).showToast();
}

function showReconnectNotify() {
  Toastify({
    text: "{{reconnect-notify}}",
    duration: 3000,
    newWindow: true,
    close: false,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: {
      background: "#0E9F6E",
      color: "white",
    },
    onClick: function () {},
  }).showToast();
}

function updateIsReady() {
  Toastify({
    text: "{{newupdate-installed}}",
    duration: 5000,
    close: false,
    gravity: "top",
    position: "left",
    stopOnFocus: true,
    className: "upd-toast",
    style: {
      background: "#7E3AF2",
    },
  }).showToast();
}

function changeServerIcon() {
  $("#g-img-input").trigger("click");
  $("#g-img-input").off("change");
}
