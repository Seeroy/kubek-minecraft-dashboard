var curDir = "/";

$(document).ready(function () {
  refreshDir();

  $("#fsbox_all").change(function () {
    if ($(this).is(":checked")) {
      selectAllCheckboxes();
    } else {
      unselectAllCheckboxes();
    }
    syncMultiplyFilesCount()
  });

  $("#nfeModal .btn-primary").click(function () {
    fn = $("#nfeModalEdit").val().trim();
    text = $("#newFileEditArea").val();
    if (fn != null) {
      startTime = performance.now()
      console.log("[FM]", "Starting file save through websockets");
      path = window.localStorage.selectedServer + curDir + fn;
      randCode = genID(20);

      socket.emit("startFileWrite", {
        path: path,
        randCode: randCode
      });
      console.log("[FM]", "emit startFileWrite");

      textSplit = text.split("\n");
      console.log("[FM]", "Sending " + textSplit.length + " fragments of file through websockets");
      textSplit.forEach(function (seg) {
        socket.emit("addFileWrite", {
          add: seg,
          randCode: randCode
        });
      });

      socket.emit("finishFileWrite", {
        randCode: randCode
      });
      console.log("[FM]", "emit finishFileWrite");
      endTime = performance.now()
      delta_sec = (endTime - startTime) / 1000;
      console.log("[PERF]", "Saving this file took " + delta_sec + " sec.");
      refreshDir();
      $("#nfeModal").hide();
    }
  });
});

function ifAllFilesSelected() {
  if ($("#fm-table td .fsboxes:checked").length == $("#fm-table td .fsboxes").length) {
    return true;
  } else {
    return false;
  }
}

function syncMultiplyFilesCount() {
  countSel = $("#fm-table td .fsboxes:checked").length;
  if (countSel > 0) {
    $(".multiply-select").show();
    $(".multiply-select .count").text(countSel + " files");
  } else {
    $(".multiply-select").hide();
  }
}

function selectAllCheckboxes() {
  $("#fm-table .fsboxes").each(function () {
    $(this).prop("checked", true);
  });
}

function deleteAllSelected() {
  syncMultiplyFilesCount();
  if ($("#fm-table td .fsboxes:checked").length > 0) {
    hideAllCards();
    $("#isremoving-card .card-text").text("{{removing-fm}}");
    $("#isremoving-card .btn-danger").unbind("click");
    $("#bdf").show();
    $("#isremoving-card").show();
    $("#isremoving-card").fadeIn(200);
    list = [];
    $("#fm-table td .fsboxes:checked").each(function () {
      item = $(this).parent().parent();
      type = $(item).data("type");
      itemarr = {
        name: $(item).find(".fn").text(),
        type: type
      }
      list.push(itemarr);
    });
    jsn = {
      path: curDir,
      list: list
    }
    str = encodeURIComponent(JSON.stringify(jsn));
    $.get("/fmapi/packetRemoving?server=" + window.localStorage.selectedServer + "&items=" + str, function (data) {
      if (data['file'] == 0 && data['directory'] == 0) {
        Toastify({
          text: "{{afterdelno-fm}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-warning)",
          }
        }).showToast();
      } else if (data['file'] != 0 && data['directory'] == 0) {
        Toastify({
          text: "{{afterdel-fm}} " + data['file'] + " {{afterdelfiles-fm}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-primary)",
          }
        }).showToast();
      } else if (data['file'] == 0 && data['directory'] != 0) {
        Toastify({
          text: "{{afterdel-fm}} " + data['directory'] + " {{afterdeldirs-fm}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-primary)",
          }
        }).showToast();
      } else if (data['file'] != 0 && data['directory'] != 0) {
        Toastify({
          text: "{{afterdel-fm}} " + data['file'] + " {{afterdelfiles-fm}}, " + data['directory'] + " {{afterdeldirs-fm}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-primary)",
          }
        }).showToast();
      }
      $("#bdf").hide();
      refreshDir();
    });
  }
}

function unselectAllCheckboxes() {
  $("#fm-table .fsboxes").each(function () {
    $(this).prop('checked', false);
  });
}

function upperDir() {
  curDir = curDir.split("/");
  curDir.pop();
  curDir.pop();
  curDir = curDir.join("/") + "/";
  refreshDir();
}

function deleteDirFM(path) {
  fn = path.split("/").slice(-1)[0];

  $("#delete-fm-modal .caption").text("{{aredelete-fm}} " + fn + "?");
  showModal("delete-fm-modal", "fadeIn", function () {
    $.get("/fmapi/deleteDirectory?server=" + window.localStorage.selectedServer + "&path=" + path, function (data) {
      refreshDir();
      if (data == "ENOTEMPTY") {
        Toastify({
          text: "{{notempty-fm}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-warning)",
          }
        }).showToast();
      }
    });
  });
}

function deleteFM(path) {
  fn = path.split("/").slice(-1)[0];

  $("#delete-fm-modal .caption").text("{{aredelete-fm}} " + fn + "?");
  showModal("delete-fm-modal", "fadeIn", function () {
    $.get("/fmapi/deleteFile?server=" + window.localStorage.selectedServer + "&path=" + path, refreshDir);
  });
}

function newdirFM() {
  $("#newdir-fm-modal .caption").text("{{new-directory-fm}}");
  $("#newdir-fm-modal .kbk-input").val("");
  showModal("newdir-fm-modal", "fadeIn", function () {
    new_dname = $("#newdir-fm-modal .kbk-input").val();
    if (new_dname.trim() != "") {
      $.get("/fmapi/newDirectory?server=" + window.localStorage.selectedServer + "&path=" + curDir + "&newdir=" + btoa(new_dname), refreshDir);
    }
  });
}

function uploadFM() {
  $("#g-file-input").trigger('click');
  $("#g-file-input").off("change");
  $("#g-file-input").change(function () {
    var formData = new FormData($("#g-file-form")[0]);
    jQuery.ajax({
      url: '/upload/file?server=' + window.localStorage.selectedServer + "&path=" + encodeURI(curDir),
      type: "POST",
      data: formData,
      success: function (data) {
        refreshDir();
      },
      error: function (data) {
        Toastify({
          text: "{{error}} " + data,
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-warning)",
          }
        }).showToast();
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}

function renameFM(path) {
  fn = path.split("/").slice(-1)[0];

  $("#rename-fm-modal .kbk-input").val(fn);
  $("#rename-fm-modal .caption").text('{{dorename-fm}} ' + fn + "?");
  showModal("rename-fm-modal", "fadeIn", function () {
    new_fname = $("#rename-fm-modal .kbk-input").val();
    if (new_fname.trim() != "") {
      $.get("/fmapi/renameFile?server=" + window.localStorage.selectedServer + "&path=" + path + "&newname=" + btoa(new_fname), refreshDir);
    }
  });
}

function saveFile() {
  startTime = performance.now()
  console.log("[FM]", "Starting file save through websockets");
  fn = $("#feModalLabel").text();
  path = window.localStorage.selectedServer + curDir + fn;
  randCode = genID(20);

  socket.emit("startFileWrite", {
    path: path,
    randCode: randCode
  });
  console.log("[FM]", "emit startFileWrite");

  textSplit = $("#fileEditArea").val().split("\n");
  console.log("[FM]", "Sending " + textSplit.length + " fragments of file through websockets");
  textSplit.forEach(function (seg) {
    socket.emit("addFileWrite", {
      add: seg,
      randCode: randCode
    });
  });

  socket.emit("finishFileWrite", {
    randCode: randCode
  });
  console.log("[FM]", "emit finishFileWrite");
  endTime = performance.now()
  delta_sec = (endTime - startTime) / 1000;
  console.log("[PERF]", "Saving this file took " + delta_sec + " sec.");
  refreshDir();
}

function genID(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

function downloadFM(path) {
  window.open("/fmapi/downloadFile?server=" + window.localStorage.selectedServer + "&path=" + path);
}

function refreshDir() {
  unselectAllCheckboxes();
  syncMultiplyFilesCount();
  if(window.matchMedia("(min-width: 320px)").matches && window.matchMedia("(max-width: 480px)").matches){
    bindev = "click";
  } else {
    bindev = "dblclick";
  }
  saveScroll = $(".fm_container>.sub-block>.contentt").scrollTop();
  $("#fm-table tbody").html("");
  $("#breadcrumb-fm").html('<li class="breadcrumb-item">' + window.localStorage.selectedServer + '</li>');
  spl = curDir.split("/");
  spl = spl.filter(element => {
    return element != "";
  });
  if (spl != "/") {
    spl.forEach(function (dir) {
      $("#breadcrumb-fm").append('<li class="breadcrumb-item">' + dir + '</li>');
    });
  }
  if (curDir != "/") {
    $("#fm-table tbody").append(
      '<tr on' + bindev + '="upperDir()"><td></td><td class="fn">..</td><td></td><td></td></tr>');
  }
  $.get("/fmapi/scanDirectory?server=" + window.localStorage.selectedServer + "&directory=" + curDir, function (data) {
    data = JSON.parse(data);
    if (typeof data == "object") {
      data = sortToDirsAndFiles(data);
      data.forEach(function (file, i) {
        size = convertFileSizeToHuman(file.size);
        obj_date = new Date(file.modify);
        mdate = formatDateFactory(obj_date);
        if (file.type == "directory") {
          act =
            '<button type="button" title="{{delete}}" onclick="deleteDirFM(' + "'" +
            curDir + file.name + "'" +
            ')"><img width=24px src="/assets/fm_icons/delete.png"></button><button type="button" title="{{rename}}" onclick=renameFM("' +
            curDir + file.name +
            '")><img width=24px src="/assets/fm_icons/edit.png"></button>';
        } else {
          act =
            '<button type="button" title="{{delete}}" onclick="deleteFM(' + "'" +
            curDir + file.name + "'" +
            ')"><img width=24px src="/assets/fm_icons/delete.png"></button><button type="button" title="{{rename}}" onclick=renameFM("' +
            curDir + file.name +
            '")><img width=24px src="/assets/fm_icons/edit.png"></button><button type="button" title="{{download}}" onclick=downloadFM("' +
            curDir + file.name +
            '")><img width=24px src="/assets/fm_icons/download.png"></button>';
        }
        if (file.type == "directory") {
          icon = "folder.png";
        } else if (file.type == "file") {
          if (file.name.match(/.*\.(jpg|jpeg|png|gif|ico|bmp|psd)/gmi) != null) {
            icon = "image.png";
          } else if (file.name.match(/.*\.(tar|zip|rar|gzip|7z|gz|tgz)/gmi) != null) {
            icon = "archive.png";
          } else if (file.name.match(/.*\.log/gmi) != null) {
            icon = "logs.png";
          } else {
            icon = "file.png";
          }
        }
        if (file.type == "directory") {
          size = "";
        }
        cb = '<input class="fsboxes" type="checkbox" id="fsbox_' + i + '" value="sel"/>';
        $("#fm-table tbody").append(
          '<tr data-type="' + file.type +
          '"><td>' + cb + '</td><td style="width: 20px;"><img height="32px" src="/assets/fm_icons/' + icon +
          '"></td><td class="fn">' +
          file.name + '</td><td>' + mdate + '</td><td>' + size + '</td><td class="buttons-td">' + act + '</td></tr>');
      });
      $("#fm-table tr").unbind("click");
      $("#fm-table td .fsboxes").change(function () {
        rs = ifAllFilesSelected();
        if (rs) {
          $("#fsbox_all").prop("checked", true);
        } else {
          $("#fsbox_all").prop("checked", false);
        }
        syncMultiplyFilesCount();
      });
      $("#fm-table tr").bind(bindev, function () {
        if ($(this).data("type") == "directory") {
          curDir += $(this).find(".fn")[0].innerText + "/";
          refreshDir();
        }
        if ($(this).data("type") == "file") {
          ext = $(this).find(".fn")[0].innerText.split(".").slice(-1)[0];
          allowedExt = ["txt", "log", "yml", "xml", "cfg", "conf", "config", "json", "yaml", "properties", "sh", "bat"];
          if (allowedExt.indexOf(ext) >= 0) {
            $("#feModalLabel").text($(this).find(".fn")[0].innerText);
            $.get("/fmapi/getFile?server=" + window.localStorage.selectedServer + "&path=" + curDir + $(this).find(".fn")[0]
              .innerText,
              function (data) {
                $("#fileEditArea").val(data);
                $("#feModal").show();
                $("#feModal").fadeIn(150);
              });
          }
        }
      });
      $(".fm_container>.sub-block>.contentt").scrollTop(saveScroll);
    }
  });
}

function newFileFM() {
  $("#fileEditArea").val("");
  $("#nfeModalEdit").val("");
  $("#nfeModal").show();
  $("#nfeModal").fadeIn(150);
}

function sortToDirsAndFiles(data) {
  dirs = [];
  files = [];
  data.forEach(function (item) {
    if (item.type == "directory") {
      dirs.push(item);
    } else {
      files.push(item);
    }
  });
  datanew = [];
  dirs.forEach(function (item) {
    datanew.push(item);
  });
  files.forEach(function (item) {
    datanew.push(item);
  });
  return datanew;
}