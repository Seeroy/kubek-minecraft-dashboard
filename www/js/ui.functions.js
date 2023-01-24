function updateMemoryAndCPUUsage_ui(data) {
  if ($("#usage-cpu-pbar").length > 0 && $("#usage-memory-pbar").length > 0) {
    if (data.cpu != NaN && data.cpu != "undefined" && data.totalmem != NaN && data.totalmem != "undefined") {
      $("#usage-cpu-pbar").css("width", data.cpu + "%");
      $("#usage-cpu-pbar").prop("aria-valuenow", data.cpu);
      $("#usage-cpu-percent").text(data.cpu + "%");
      memUsage = (data.usedmem / 1024 / 1024 / 1024).toFixed(1) + " GB / " + (data.totalmem / 1024 / 1024 /
        1024).toFixed(1) + " GB";
      memPercent = Math.round(data.usedmem / data.totalmem * 100);
      $("#usage-memory-count").text(memUsage);
      $("#usage-memory-pbar").css("width", memPercent + "%");
      $("#usage-memory-pbar").prop("aria-valuenow", memPercent);
      $("#usage-memory-percent").text(memPercent + "%");
    }
  }
}

function updateServersStatuses_ui(data) {
  if (data[window.localStorage.selectedServer].status == "stopped") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-danger");
    $("#status-text").html("{{status-stopped}}");
    $(".server-control.btn-success").show();
    $(".server-control.btn-danger").hide();
    $(".server-control.btn-warning").hide();
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/stopped.png");
  } else if (data[window.localStorage.selectedServer].status == "started") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-success");
    $("#status-text").html("{{status-started}}");
    $(".server-control.btn-success").hide();
    $(".server-control.btn-danger").show();
    $(".server-control.btn-warning").show();
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/started.png");
  } else if (data[window.localStorage.selectedServer].status == "starting") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-warning");
    $("#status-text").html("{{status-starting}}");
    $(".server-control.btn-success").hide();
    $(".server-control.btn-danger").hide();
    $(".server-control.btn-warning").hide();
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/starting.png");
  } else if (data[window.localStorage.selectedServer].status == "stopping") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-warning");
    $("#status-text").html("{{status-stopping}}");
    $(".server-control.btn-success").hide();
    $(".server-control.btn-danger").hide();
    $(".server-control.btn-warning").hide();
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/starting.png");
  }
}

function updateServerDataFromQuery_ui(data) {
  $("#server-version").text(data.server_modification.name);
  if (data.server_modification.name.split(" ")[0] == "Paper") {
    $("#server-version-icon").attr("src", "/assets/cores/paper.png");
  } else if (data.server_modification.name.split(" ")[0] == "Spigot") {
    $("#server-version-icon").attr("src", "/assets/cores/spigot.png");
  } else if (data.server_modification.name.split(" ")[0] == "Forge") {
    $("#server-version-icon").attr("src", "/assets/cores/forge.png");
  } else {
    $("#server-version-icon").attr("src", "");
  }
  $("#server-players-count").text(data.players.online + "/" + data.players.max);
  $("#players-list").html("");
  if (data.players.sample.length > 0) {
    data.players.sample.forEach(function (player) {
      console.log(player);
      $("#players-list").append('<li><img class="rounded-3" src="https://minotar.net/avatar/' + player + '" height="24"><span>' + player + '</span></li>');
    });
  }
}

function afterSocketHandshake() {
  memoryUpdInterval = setInterval(function () {
    socket.emit("update", {
      type: "usage"
    });
  }, 3000);
  console.log("[WS]", "Setup`ed 'memory' update interval");

  queryUpdInterval = setInterval(function () {
    updateQuery_socket();
  }, 6000);
  console.log("[WS]", "Setup`ed 'query' update interval");

  socket.emit("update", {
    type: "usage"
  });
  setTimeout(updateQuery_socket, 1200);
  socket.emit("update", {
    type: "servers"
  });
}

function updateQuery_socket() {
  if ($("#status-text").text() == "{{status-started}}") {
    socket.emit("update", {
      type: "query",
      server: window.localStorage.selectedServer
    });
  } else {
    $("#server-version").text("{{unknown}}");
    $("#server-players-count").text("{{unknown}}");
    $("#server-version-icon").attr("src", "");
  }
}