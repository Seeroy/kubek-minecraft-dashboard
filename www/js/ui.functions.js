var cpu_saves = [];
var cpu_chart;

function updateMemoryAndCPUUsage_ui(data) {
  if (data.cpu != NaN && data.cpu != "undefined" && data.totalmem != NaN && data.totalmem != "undefined" && $("#usage-cpu-percent").length > 0) {
    memUsage = (data.usedmem / 1024 / 1024 / 1024).toFixed(1) + " GB / " + (data.totalmem / 1024 / 1024 /
      1024).toFixed(1) + " GB";
    memPercent = Math.round(data.usedmem / data.totalmem * 100);
    $("#usage-cpu-percent").text(data.cpu + "%");
    $("#usage-memory-text").text(memUsage + " (" + memPercent + "%)");
    setColorBySelector_ui(genColorFromPercent(data.cpu), "#usage-cpu-percent");
    setColorBySelector_ui(genColorFromPercent(memPercent), "#usage-memory-text");
    if (cpu_saves.length >= 100) {
      cpu_saves = [];
    }
    cpu_saves.push(data.cpu);
    createCPUChart();
  }
}

function createCPUChart() {
  if (window.localStorage.ct__cpuchart == 'true') {
    if (typeof cpu_chart !== "undefined") {
      cpu_chart.destroy();
      cpu_chart = undefined;
    }
    genlabels = [];
    for (i = 1; i < cpu_saves.length; i++) {
      genlabels.push(i);
    }
    cpu_chart = new Chart(document.getElementById("cpu-chart"), {
      type: 'line',
      data: {
        labels: genlabels,
        datasets: [{
          data: cpu_saves,
          label: "CPU",
          borderColor: "#3b71ca",
          borderCapStyle: "round",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        tooltips: {
          enabled: false,
        },
        legend: {
          display: false
        },
        animation: {
          duration: 0
        },
      }
    });
  }
}

function setColorBySelector_ui(colorClass, selector) {
  $(selector).removeClass("text-warning");
  $(selector).removeClass("text-danger");
  $(selector).removeClass("text-success");
  $(selector).addClass("text-" + colorClass);
}

function genColorFromPercent(percent) {
  if (percent < 60) {
    return "success";
  } else if (percent >= 60 && percent < 80) {
    return "warning";
  } else {
    return "danger";
  }
}

function updateServersStatuses_ui(data) {
  if (data[window.localStorage.selectedServer].status == "stopped") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-danger");
    $("#status-text").html("{{status-stopped}}");
    $(".server-control.btn-success").show();
    $(".server-control.killsrv").hide();
    $(".server-control.stopsrv").hide();
    $(".server-control.btn-warning").hide();
    if ($(".server-control.btn-light").length > 0) {
      $(".server-control.btn-light").hide();
    }
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/stopped.png");
  } else if (data[window.localStorage.selectedServer].status == "started") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-success");
    $("#status-text").html("{{status-started}}");
    $(".server-control.btn-success").hide();
    $(".server-control.killsrv").show();
    $(".server-control.stopsrv").show();
    $(".server-control.btn-warning").show();
    if ($(".server-control.btn-light").length > 0) {
      $(".server-control.btn-light").hide();
    }
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/started.png");
  } else if (data[window.localStorage.selectedServer].status == "starting") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-warning");
    $("#status-text").html("{{status-starting}}");
    $(".server-control.btn-success").hide();
    $(".server-control.killsrv").show();
    $(".server-control.stopsrv").hide();
    $(".server-control.btn-warning").hide();
    if ($(".server-control.btn-light").length > 0) {
      $(".server-control.btn-light").show();
    }
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/starting.png");
  } else if (data[window.localStorage.selectedServer].status == "stopping") {
    $("#status-circle").removeClass("bg-success bg-danger bg-warning");
    $("#status-circle").addClass("bg-warning");
    $("#status-text").html("{{status-stopping}}");
    $(".server-control.btn-success").hide();
    $(".server-control.killsrv").show();
    $(".server-control.stopsrv").hide();
    $(".server-control.btn-warning").hide();
    if ($(".server-control.btn-light").length > 0) {
      $(".server-control.btn-light").show();
    }
    $("#servers-list-sidebar .list-group-item.active .server-status").attr("src", "/assets/statuses/starting.png");
  }
}

function updateServerDataFromQuery_ui(data) {
  $("#server-version").text(data.version.name);
  if (data.version.name.split(" ")[0] == "Paper") {
    $("#server-version-icon").attr("src", "/assets/cores/paper.png");
  } else if (data.version.name.split(" ")[0] == "Spigot") {
    $("#server-version-icon").attr("src", "/assets/cores/spigot.png");
  } else if (data.version.name.split(" ")[0] == "Forge") {
    $("#server-version-icon").attr("src", "/assets/cores/forge.png");
  } else {
    $("#server-version-icon").attr("src", "");
  }
  $("#server-version-item").addClass("d-flex");
  $("#server-version-item").show();
  $("#server-players-count").text(data.players.online + "/" + data.players.max);
  $("#players-heads-list").html("");
  if (data.players.sample != null && data.players.sample.length > 0) {
    data.players.sample.forEach(function (player, ii) {
      if (ii < 15) {
        $("#players-heads-list").append('<img src="https://minotar.net/avatar/' + player + '/20" title="' + player + '">');
      }
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
    $("#server-version-item").removeClass("d-flex");
    $("#server-version-item").hide();
  }
}