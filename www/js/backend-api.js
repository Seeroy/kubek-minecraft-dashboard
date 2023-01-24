function updateMemoryAndCPUUsage_ui(data) {
  if ($("#usage-cpu-pbar").length > 0 && $("#usage-memory-pbar").length > 0) {
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

function updateServersStatuses_ui(data) {
  if (data[window.localStorage.selectedServer].status == "stopped") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-danger");
    $("#status-text").html("Stopped");
    $("#server-control.btn-success").show();
    $("#server-control.btn-danger").hide();
    $("#server-control.btn-warning").hide();
  } else if (data[window.localStorage.selectedServer].status == "started") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-success");
    $("#status-text").html("Started");
    $("#server-control.btn-success").hide();
    $("#server-control.btn-danger").show();
    $("#server-control.btn-warning").show();
  } else if (data[window.localStorage.selectedServer].status == "starting") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-warning");
    $("#status-text").html("Starting");
    $("#server-control.btn-success").hide();
    $("#server-control.btn-danger").show();
    $("#server-control.btn-warning").hide();
  } else if (data[window.localStorage.selectedServer].status == "stopping") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-warning");
    $("#status-text").html("Stopping");
    $("#server-control.btn-success").hide();
    $("#server-control.btn-danger").show();
    $("#server-control.btn-warning").hide();
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
  $("#table-players-count").text(data.players.online + "/" + data.players.max);
  console.log(data.players);
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
  socket.emit("update", {
    type: "servers"
  });
}

function updateQuery_socket() {
  if ($("#status-text").text() == "Online") {
    socket.emit("update", {
      type: "query",
      server: window.localStorage.selectedServer
    });
  } else {
    $("#server-version").text("Unknown");
    $("#server-players-count").text("Unknown");
    $("#server-version-icon").attr("src", "/assets/cores/bungeecord.png");
  }
}