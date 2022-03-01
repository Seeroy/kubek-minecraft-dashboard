var currentServer;
var rr;
var di;
var di2;
var old_rgr;
var publicIP;
var localIP;
var ngrokIP = " ";

var cBar;
var mBar;

$(document).ready(function () {
  mBar = new ProgressBar.SemiCircle(memoryBar, {
    strokeWidth: 6,
    color: '#FFEA82',
    trailColor: '#eee',
    trailWidth: 1,
    easing: 'easeInOut',
    duration: 1400,
    svgStyle: null,
    text: {
      value: '',
      alignToBottom: false
    },
    from: {
      color: '#FFEA82'
    },
    to: {
      color: '#ED6A5A'
    },
    step: (state, mBar) => {
      mBar.path.setAttribute('stroke', state.color);
      var value = Math.round(mBar.value() * 100);
      if (value === 0) {
        mBar.setText('');
      } else {
        mBar.setText(value);
      }

      mBar.text.style.color = state.color;
    }
  });
  cBar = new ProgressBar.SemiCircle(cpuBar, {
    strokeWidth: 6,
    color: '#FFEA82',
    trailColor: '#eee',
    trailWidth: 1,
    easing: 'easeInOut',
    duration: 1400,
    svgStyle: null,
    text: {
      value: '',
      alignToBottom: false
    },
    from: {
      color: '#FFEA82'
    },
    to: {
      color: '#ED6A5A'
    },
    step: (state, cBar) => {
      cBar.path.setAttribute('stroke', state.color);
      var value = Math.round(cBar.value() * 100);
      if (value === 0) {
        cBar.setText('');
      } else {
        cBar.setText(value);
      }

      cBar.text.style.color = state.color;
    }
  });

  loadPage("console");
  currentServer = findGetParameter("server");
  cBar.animate(0.0);
  mBar.animate(0.0);
  $(".g-img img").attr("src", "/server/icon?server=" + currentServer);
  $(".kubekVersion").load("/kubek/version");
  $(".lay2 .tabs .tab").click(function () {
    $(".lay2 .tabs .selected").removeClass("selected");
    $(this).addClass("selected");
    loadPage($(this).data("page"));
  });

  $(".serSelect").change(function () {
    window.location = "/?server=" + $(".serSelect option:selected").text();
  });

  $('input[type=radio][name=flexRadioDefault]').change(function () {
    if ($(this).val() == "select") {
      $("#g-core-form").hide();
      $(".coreSelect").show();
    } else if ($(this).val() == "upload") {
      $("#g-core-form").show();
      $(".coreSelect").hide();
    }
  });

  $(".tabs .startbtn").click(function () {
    $.get("/server/start?server=" + currentServer);
  });

  $(".tabs .stopbtn").click(function () {
    $.get("/server/command?server=" + currentServer + "&cmd=stop");
  });

  $(".toggleCreateServerModal").click(function () {
    $("#createServerModal .modal-title").html("New server");
    $("#createServerModal .hideWhileCreating").each(function () {
      $(this).show();
    });
    $("#createServerModal .showWhileCreating").each(function () {
      $(this).hide();
    });
    $("#createServerModal .srvNamee").val("");
  });

  $("#createServerModal .createSrvButton").click(function () {
    if ($("#createServerModal .srvNamee").val() != "" && $("#createServerModal .xmxMem").val() != "") {
      $("#createServerModal .modal-title").html("Creating server");
      $("#createServerModal .hideWhileCreating").each(function () {
        $(this).hide();
      });
      $("#createServerModal .showWhileCreating").each(function () {
        $(this).show();
      });
      if ($('.hideWhileCreating input[type=radio][name=flexRadioDefault]:checked').val() == "select") {
        $("#createServerModal .showWhileCreating #downProgress").show();
        $("#createServerModal .showWhileCreating p").html("Searching core");
        sname = $("#createServerModal .hideWhileCreating .srvNamee").val();
        core = $("#createServerModal .hideWhileCreating .coreSelect option:selected").html();
        if (core.substring(0, 1) == "P") {
          $.get("/cores/search?core=" + core, function (data) {
            if (data != "") {
              $("#createServerModal .showWhileCreating p").html("{{downloadingcore}}");
              $.get("/file/download?url=" + data + "&server=" + sname + "&filename=" + data.substring(data.lastIndexOf('/') + 1) + "&type=core");
              rr = setInterval(function () {
                getProgress(data.substring(data.lastIndexOf('/') + 1))
              }, 25);
            }
          });
        } else {
          $.get("/cores/spigot/list", function (data) {
            url = data[core.replace("Spigot ", "")];
            $("#createServerModal .showWhileCreating p").html("{{downloadingcore}}");
            $.get("/file/download?url=" + url + "&server=" + sname + "&filename=" + url.substring(url.lastIndexOf('/') + 1) + "&type=core");
            rr = setInterval(function () {
              getProgress(url.substring(url.lastIndexOf('/') + 1))
            }, 25);
          });
        }
      } else if ($('.hideWhileCreating input[type=radio][name=flexRadioDefault]:checked').val() == "upload") {
        $("#createServerModal .showWhileCreating #downProgress").hide();
        $("#createServerModal .showWhileCreating p").html("{{uploadingCore}}");
        uploadCore();
      }
    }
  });
});

function updateUsage() {
  $.get("/kubek/usage", function (data) {
    $(".cValue").html(data.cpu + "%");
    cBar.animate((data.cpu / 100).toFixed(2));
    $(".mValue").html((data.usedmem / 1024 / 1024 / 1024).toFixed(1) + " GB / " + (data.totalmem / 1024 / 1024 / 1024).toFixed(1) + " GB");
    mbvalue = (data.usedmem / data.totalmem).toFixed(2);
    mBar.animate(mbvalue);
  });
}

function changeServerIcon() {
  $("#g-img-input").trigger('click');
  $("#g-img-input").off("change");
  $("#g-img-input").change(function () {
    $("#g-type-input").val("server-icon");
    $("#g-server-input").val(currentServer);
    var formData = new FormData($("#g-img-form")[0]);
    jQuery.ajax({
      url: '/file/upload?type=server-icon.png&server=' + currentServer,
      type: "POST",
      data: formData,
      success: function (data) {
        Swal.fire(
          '{{success}}',
          '{{restartServerToSeeChanges}}',
          'success'
        ).then((result) => {
          window.location = "";
        });
      },
      error: function (data) {
        Swal.fire(
          '{{error}}',
          '{{ErrorWhileUploadingPNG}}',
          'error'
        );
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}

function uploadCore() {
  var formData = new FormData($("#g-core-form")[0]);
  jQuery.ajax({
    url: '/core/upload?server=' + $(".srvNamee").val(),
    type: "POST",
    data: formData,
    success: function (data) {
      $("#createServerModal .showWhileCreating p").html("{{Completion}}");
      $('#createServerModal .hideWhileCreating .onMode').is(':checked') ? ttr = "true" : ttr = "false";
      sname = $("#createServerModal .hideWhileCreating .srvNamee").val();
      jarfile = $("#g-core-input")[0].value.split(/(\\|\/)/g).pop();
      $.get("/server/completion?server=" + encodeURI(sname) + "&jf=" + jarfile + "&memory=" + $("#createServerModal .hideWhileCreating .xmxMem").val() + "&port=" + $("#createServerModal .hideWhileCreating .srvPort").val() + "&onMode=" + ttr, function (data) {
        document.location.reload();
      });
    },
    error: function (data) {
      Swal.fire(
        '{{error}}',
        '{{ErrorWhileUploadingCore}}',
        'error'
      );
    },
    cache: false,
    contentType: false,
    processData: false,
  });
}

function getProgress(jarfile) {
  $.get("/tasks/progress", function (data) {
    if (typeof (old_rgr) === "undefined" || old_rgr != data) {
      if (typeof (old_rgr) !== "undefined") {
        keys1 = Object.keys(data);
        keys2 = Object.keys(old_rgr);
        diff = arr_diff(keys1, keys2);
        diff.forEach(function (diffi) {
          $("#createServerModal .showWhileCreating #downProgress").val(0);
          clearInterval(rr);
          $("#createServerModal .showWhileCreating p").html("{{Completion}}");
          $('#createServerModal .hideWhileCreating .onMode').is(':checked') ? ttr = "true" : ttr = "false";
          $.get("/server/completion?server=" + encodeURI(sname) + "&jf=" + jarfile + "&memory=" + $("#createServerModal .hideWhileCreating .xmxMem").val() + "&port=" + $("#createServerModal .hideWhileCreating .srvPort").val() + "&onMode=" + ttr, function (data) {
            document.location.reload();
          });
        });
      }
      old_rgr = data;
    } else {
      $("#createServerModal .showWhileCreating #downProgress").val(data[jarfile]);
    }
  });
}

function updateServersList() {
  $.get("/servers/list", function (servers) {
    fg = findGetParameter("server");
    if (typeof (fg) === "undefined" || fg == "" || !servers.includes(fg)) {
      window.location = window.location.href.split('?')[0] + "?server=" + servers[0];
    } else {
      $(".servername").html(fg);
    }
    servers.forEach(function (data, i) {
      fg = findGetParameter("server");
      if (data == fg) {
        select = " selected";
        currentServer = fg;
      } else {
        select = "";
      }
      $(".serSelect").append('<option value="' + i + '"' + select + '>' + data + '</option>');
    });
  });
}

function findGetParameter(parameterName) {
  var result = null,
    tmp = [];
  location.search
    .substr(1)
    .split("&")
    .forEach(function (item) {
      tmp = item.split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    });
  return result;
}

function updateServersStatus() {
  $.get("/servers/statuses", function (data) {
    if (typeof (data[currentServer]) !== "undefined") {
      if (data[currentServer].status == "stopped") {
        $(".srvstatus").removeClass("badge-success badge-warning");
        $(".srvstatus").addClass("badge-danger");
        $(".srvstatus").html("{{offline}}");
        $(".tabs .startbtn").show();
        $(".tabs .stopbtn").hide();
      } else if (data[currentServer].status == "started") {
        $(".srvstatus").removeClass("badge-danger badge-warning");
        $(".srvstatus").addClass("badge-success");
        $(".srvstatus").html("{{online}}");
        $(".tabs .startbtn").hide();
        $(".tabs .stopbtn").show();
      } else if (data[currentServer].status == "starting") {
        $(".srvstatus").removeClass("badge-success badge-danger");
        $(".srvstatus").addClass("badge-warning");
        $(".srvstatus").html("{{starting}}");
        $(".tabs .startbtn").hide();
        $(".tabs .stopbtn").hide();
      } else if (data[currentServer].status == "stopping") {
        $(".srvstatus").removeClass("badge-success badge-danger");
        $(".srvstatus").addClass("badge-warning");
        $(".srvstatus").html("{{stopping}}");
        $(".tabs .startbtn").hide();
        $(".tabs .stopbtn").hide();
      }
    }
  });
}

function updateIP() {
  $.get("/server/publicIP?server=" + currentServer, function (data) {
    publicIP = data;
    localIP = "localhost:" + data.split(":")[1];
  });
}

function updateLog() {
  $.get("/server/log?server=" + currentServer, function (data) {
    maxScroll = $(".termiText")[0].scrollHeight - $(".termiText").outerHeight();
    if ($(".termiText").scrollTop() == maxScroll) {
      scrl = true;
    } else {
      scrl = false;
    }
    $(".termiText").html("");
    lines = data.split("\n");
    lines.forEach(function (line) {
      line = line.replace("<br>", "").replace("\r", "").replace("\n", "");
      indox = line.indexOf("]");
      indox += 2;
      time = line.substr(0, indox);
      if (time.substr(0, 1) == "[") {
        line = line.replace(time, "");
      }
      if (line.indexOf("WARN") >= 0) {
        if (time.substr(0, 1) == "[") {
          $(".termiText").append("<span style='color: #ffb400 !important; font-weight: 400;'>" + time + line + "</span><br>");
        } else {
          $(".termiText").append("<span style='color: #ffb400 !important; font-weight: 400;'>" + line + "</span><br>");
        }
      } else if (line.indexOf("ERROR") >= 0 || line.indexOf("ERR") >= 0) {
        if (time.substr(0, 1) == "[") {
          $(".termiText").append("<span style='color: #c4183c !important; font-weight: 400;'>" + time + line + "</span><br>");
        } else {
          $(".termiText").append("<span style='color: #c4183c !important; font-weight: 400;'>" + line + "</span><br>");
        }
      } else {
        if (time.substr(0, 1) == "[") {
          $(".termiText").append("<span style='color: white !important; font-weight: 400;'>" + time + "</span><span style='color: rgb(190,190,190) !important; font-weight: 400;'>" + line + "</span><br>");
        } else {
          $(".termiText").append("<span style='color: white) !important; font-weight: 400;'>" + line + "</span><br>");
        }
      }
    });
    maxScroll = $(".termiText")[0].scrollHeight - $(".termiText").outerHeight();
    if (scrl == true) {
      $(".termiText").scrollTop(maxScroll);
    }
  });
}

function updateQuery() {
  $.get("/server/query?server=" + currentServer, function (data) {
    if (typeof (data.version) !== "undefined") {
      $(".g-srvcore .srvcore").html(data.version.name);
    } else {
      $(".g-srvcore .srvcore").html("{{unknown}}");
    }
    if (typeof (data.players) !== "undefined") {
      $(".g-srvplayers .srvplayerscount").html(data.players.online + "/" + data.players.max + " players");
    } else {
      $(".g-srvplayers .srvplayerscount").html("{{unknown}}");
    }
    maxmem = Math.round(data.totalmem / 1024 / 1024 / 1024) * 1024;
    $("#createServerModal .hideWhileCreating .xmxMem").attr({
      "max": maxmem
    });
  });
}

function banPlayer(player) {
  $.get("/server/command?server=" + currentServer + "&cmd=ban " + player);
}

function updateCoresList() {
  $.get("/cores/list", function (data) {
    $("#createServerModal .coreSelect").html("");
    data.forEach(function (core, i) {
      if (i == 0) {
        sel = " selected";
      } else {
        sel = "";
      }
      $("#createServerModal .coreSelect").append("<option" + sel + ">" + core + "</option>");
    });
  });
  $.get("/cores/spigot/list", function (data) {
    keys = Object.keys(data);
    keys.forEach(function (key) {
      core = "Spigot " + key;
      $("#createServerModal .coreSelect").append("<option>" + core + "</option>");
    });
  });
}

function loadPage(page) {
  if (typeof (di) !== "undefined") {
    clearInterval(di);
  }
  if (typeof (di2) !== "undefined") {
    clearInterval(di2);
  }
  $.get("/pages/" + page + ".html", function (data) {
    $(".layout > .main").html(data);
  });
}