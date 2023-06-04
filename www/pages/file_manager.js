var curDir = "/";

$(document).ready(function () {
  refreshDir();

  $("#fsbox_all").change(function () {
    if ($(this).is(":checked")) {
      selectAllCheckboxes();
    } else {
      unselectAllCheckboxes();
    }
    syncMultiplyFilesCount();
  });
});

function ifAllFilesSelected() {
  if (
    $("#fm-table td .fsboxes:checked").length ==
    $("#fm-table td .fsboxes").length
  ) {
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
        type: type,
      };
      list.push(itemarr);
    });
    jsn = {
      path: curDir,
      list: list,
    };
    str = encodeURIComponent(JSON.stringify(jsn));
    $.get(
      "/fmapi/packetRemoving?server=" +
        window.localStorage.selectedServer +
        "&items=" +
        str,
      function (data) {
        if (data["file"] == 0 && data["directory"] == 0) {
          Toastify({
            text: "{{afterdelno-fm}}",
            duration: 3000,
            newWindow: true,
            close: false,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "#E3A008",
            },
          }).showToast();
        } else if (data["file"] != 0 && data["directory"] == 0) {
          Toastify({
            text: "{{afterdel-fm}} " + data["file"] + " {{afterdelfiles-fm}}",
            duration: 3000,
            newWindow: true,
            close: false,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "#1C64F2",
            },
          }).showToast();
        } else if (data["file"] == 0 && data["directory"] != 0) {
          Toastify({
            text:
              "{{afterdel-fm}} " + data["directory"] + " {{afterdeldirs-fm}}",
            duration: 3000,
            newWindow: true,
            close: false,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "#1C64F2",
            },
          }).showToast();
        } else if (data["file"] != 0 && data["directory"] != 0) {
          Toastify({
            text:
              "{{afterdel-fm}} " +
              data["file"] +
              " {{afterdelfiles-fm}}, " +
              data["directory"] +
              " {{afterdeldirs-fm}}",
            duration: 3000,
            newWindow: true,
            close: false,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
              background: "#1C64F2",
            },
          }).showToast();
        }
        $("#bdf").hide();
        refreshDir();
      }
    );
  }
}

function unselectAllCheckboxes() {
  $("#fm-table .fsboxes").each(function () {
    $(this).prop("checked", false);
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
    path = encodeURIComponent(path);
    $.get(
      "/fmapi/deleteDirectory?server=" +
        window.localStorage.selectedServer +
        "&path=" +
        path,
      function (data) {
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
              background: "#E3A008",
            },
          }).showToast();
        }
      }
    );
  });
}

function deleteFM(path) {
  fn = path.split("/").slice(-1)[0];

  $("#delete-fm-modal .caption").text("{{aredelete-fm}} " + fn + "?");
  showModal("delete-fm-modal", "fadeIn", function () {
    path = encodeURIComponent(path);
    $.get(
      "/fmapi/deleteFile?server=" +
        window.localStorage.selectedServer +
        "&path=" +
        path,
      refreshDir
    );
  });
}

function newdirFM() {
  $("#newdir-fm-modal input[type=text]").val("");
  showModal(
    "newdir-fm-modal",
    "fadeIn",
    function () {
      new_dname = $("#newdir-fm-modal input[type=text]").val();
      if (new_dname.trim() != "") {
        $.get(
          "/fmapi/newDirectory?server=" +
            window.localStorage.selectedServer +
            "&path=" +
            curDir +
            "&newdir=" +
            btoa(new_dname),
          refreshDir
        );
      }
    },
    true
  );
}

function uploadFM() {
  $("#g-file-input").trigger("click");
  $("#g-file-input").off("change");
  $("#g-file-input").change(function () {
    var formData = new FormData($("#g-file-form")[0]);
    jQuery.ajax({
      url:
        "/upload/file?server=" +
        window.localStorage.selectedServer +
        "&path=" +
        encodeURI(curDir),
      type: "POST",
      data: formData,
      success: function (data) {
        refreshDir();
      },
      error: function (data) {
        console.log(data);
        Toastify({
          text: "{{error}} " + data,
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "#E3A008",
          },
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

  $("#rename-fm-modal input[type=text]").val(fn);
  $("#rename-fm-modal input[type=text]").attr("placeholder", fn);
  $("#rename-fm-modal .caption").text("{{dorename-fm}} " + fn + "?");
  showModal(
    "rename-fm-modal",
    "fadeIn",
    function () {
      new_fname = $("#rename-fm-modal input[type=text]").val();
      if (new_fname.trim() != "") {
        path = encodeURIComponent(path);
        $.get(
          "/fmapi/renameFile?server=" +
            window.localStorage.selectedServer +
            "&path=" +
            path +
            "&newname=" +
            btoa(new_fname),
          refreshDir
        );
      }
    },
    true
  );
}

function saveFile() {
  startTime = performance.now();
  console.log("[FM]", "Starting file save through websockets");
  fn = $("#feModalLabel").text();
  path = window.localStorage.selectedServer + curDir + fn;
  randCode = genID(20);

  socket.emit("startFileWrite", {
    path: path,
    randCode: randCode,
  });
  console.log("[FM]", "emit startFileWrite");

  textSplit = $("#fileEditArea").val().split("\n");
  partsCount = Math.round(100 / textSplit.length);
  console.log(
    "[FM]",
    "Sending " + textSplit.length + " fragments of file through websockets"
  );
  textSplit.forEach(function (seg, i) {
    socket.emit("addFileWrite", {
      add: seg,
      randCode: randCode,
    });
    setTimeout(function () {
      animateTopbar(partsCount * i, 5);
    }, 10 * i);
  });
  setTimeout(function () {
    animateTopbar(0, 50);
  }, 11 * textSplit.length);

  socket.emit("finishFileWrite", {
    randCode: randCode,
  });
  console.log("[FM]", "emit finishFileWrite");
  endTime = performance.now();
  delta_sec = (endTime - startTime) / 1000;
  console.log("[PERF]", "Saving this file took " + delta_sec + " sec.");
  animateTopbar(0, 20);
  refreshDir();
}

function genID(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function downloadFM(path) {
  window.open(
    "/fmapi/downloadFile?server=" +
      window.localStorage.selectedServer +
      "&path=" +
      path
  );
}

function refreshDir() {
  animateTopbar(25, 20);
  unselectAllCheckboxes();
  syncMultiplyFilesCount();
  if (
    window.matchMedia("(min-width: 320px)").matches &&
    window.matchMedia("(max-width: 480px)").matches
  ) {
    bindev = "click";
  } else {
    bindev = "dblclick";
  }
  saveScroll = $(".fm-container #oldc").scrollTop();
  $("#fm-table tbody").html("");
  $("#breadcrumb-fm").html(
    '<li><div class="flex items-center"><svg aria-hidden="true" class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg><a href="#" class="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white">' +
      window.localStorage.selectedServer +
      "</a></div></li>"
  );
  spl = curDir.split("/");
  spl = spl.filter((element) => {
    return element != "";
  });
  if (spl != "/") {
    spl.forEach(function (dir) {
      $("#breadcrumb-fm").append(
        '<li><div class="flex items-center"><svg aria-hidden="true" class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg><a href="#" class="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white">' +
          dir +
          "</a></div></li>"
      );
    });
  }
  $("#breadcrumb-fm li:not(:last-child) a").click(function () {
    if ($(this).text() == window.localStorage.selectedServer) {
      curDir = "/";
      refreshDir();
    } else {
      path = "";
      index = $(this).index();
      $("#breadcrumb-fm li:not(:last-child) a").each(function (ind) {
        if (
          $(this).text() != window.localStorage.selectedServer &&
          ind <= index
        ) {
          path = path + $(this).text() + "/";
        }
      });
      curDir = path;
      refreshDir();
    }
  });
  if (curDir != "/") {
    $("#fm-table tbody").append(
      "<tr class='bg-white dark:bg-gray-800 glassmorphed cursor-pointer' on" +
        bindev +
        '="upperDir()"><td></td><td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white fn">..</td><td></td><td></td><td></td><td></td></tr>'
    );
  }
  $.get(
    "/fmapi/scanDirectory?server=" +
      window.localStorage.selectedServer +
      "&directory=" +
      curDir,
    function (data) {
      animateTopbar(50, 20);
      data = JSON.parse(data);
      if (typeof data == "object") {
        data = sortToDirsAndFiles(data);
        data.forEach(function (file, i) {
          size = convertFileSizeToHuman(file.size);
          obj_date = new Date(file.modify);
          mdate = formatDateFactory(obj_date);
          if (file.type == "directory") {
            act =
              '<button type="button" title="{{delete}}" class="glassmorphed text-black dark:text-white font-medium rounded-lg text-sm mr-2 focus:outline-none inline-flex items-center justify-center" style="height: 40px; width: 40px;" onclick="deleteDirFM(' +
              "'" +
              curDir +
              file.name +
              "'" +
              ')"><img width=24px src="/assets/fm_icons/delete.png"></button><button class="glassmorphed text-black dark:text-white font-medium rounded-lg text-sm mr-2 focus:outline-none inline-flex items-center justify-center" style="height: 40px; width: 40px;" type="button" title="{{rename}}" onclick="renameFM(' + "'" +
              curDir +
              file.name + "'" +
              ')"><img width=24px src="/assets/fm_icons/edit.png"></button>';
          } else {
            act =
              '<button class="glassmorphed text-black dark:text-white font-medium rounded-lg text-sm mr-2 focus:outline-none inline-flex items-center justify-center" style="height: 40px; width: 40px;" type="button" title="{{delete}}" onclick="deleteFM(' +
              "'" +
              curDir +
              file.name +
              "'" +
              ')"><img width=24px src="/assets/fm_icons/delete.png"></button><button class="glassmorphed text-black dark:text-white font-medium rounded-lg text-sm mr-2 focus:outline-none inline-flex items-center justify-center" style="height: 40px; width: 40px;" type="button" title="{{rename}}" onclick="renameFM(' + "'" + 
              curDir +
              file.name + "'" +
              ')"><img width=24px src="/assets/fm_icons/edit.png"></button><button class="glassmorphed text-black dark:text-white font-medium rounded-lg text-sm mr-2 focus:outline-none inline-flex items-center justify-center" style="height: 40px; width: 40px;" type="button" title="{{download}}" onclick="downloadFM(' + "'" +
              curDir +
              file.name + "'" +
              ')"><img width=24px src="/assets/fm_icons/download.png"></button>';
          }
          if (file.type == "directory") {
            icon = "folder.png";
          } else if (file.type == "file") {
            if (
              file.name.match(/.*\.(jpg|jpeg|png|gif|ico|bmp|psd)/gim) != null
            ) {
              icon = "image.png";
            } else if (
              file.name.match(/.*\.(tar|zip|rar|gzip|7z|gz|tgz)/gim) != null
            ) {
              icon = "archive.png";
            } else if (file.name.match(/.*\.log/gim) != null) {
              icon = "logs.png";
            } else {
              icon = "file.png";
            }
          }
          if (file.type == "directory") {
            size = "";
          }
          cb =
            '<input class="fsboxes" type="checkbox" id="fsbox_' +
            i +
            '" value="sel"/>';
          $("#fm-table tbody").append(
            '<tr class="bg-white dark:bg-gray-800 glassmorphed cursor-pointer" data-type="' +
              file.type +
              '"><td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
              cb +
              '</td><td class="px-2 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><img style="height: 32px; width: 32px;" src="/assets/fm_icons/' +
              icon +
              '"></td><td class="pl-5 px-2 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white fn" style="width: 50%;">' +
              file.name +
              '</td><td class="px-2 py-4 font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">' +
              mdate +
              '</td><td class="px-2 py-4 font-semibold text-gray-700 whitespace-nowrap dark:text-gray-300">' +
              size +
              '</td><td class="px-2 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
              act +
              "</td></tr>"
          );
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
            allowedExt = [
              "txt",
              "log",
              "yml",
              "xml",
              "cfg",
              "conf",
              "config",
              "json",
              "yaml",
              "properties",
              "sh",
              "bat",
            ];
            if (allowedExt.indexOf(ext) >= 0) {
              $("#feModalLabel").text($(this).find(".fn")[0].innerText);
              $.get(
                "/fmapi/getFile?server=" +
                  window.localStorage.selectedServer +
                  "&path=" +
                  curDir +
                  $(this).find(".fn")[0].innerText,
                function (data) {
                  $("#fileEditArea").val(data);
                  showModal("editfile-fm-modal", "fadeIn", function () {
                    saveFile();
                  });
                }
              );
            }
          }
        });
        $(".fm-container #oldc").scrollTop(saveScroll);
        animateTopbar(100, 20);
        setTimeout(function () {
          animateTopbar(0, 10);
        }, 21);
      }
    }
  );
}

function newFileFM() {
  $("#newFileEditArea").val("");
  $("#nfeModalEdit").val("");
  showModal("newfile-fm-modal", "fadeIn", function () {
    fn = $("#nfeModalEdit").val().trim();
    text = $("#newFileEditArea").val();
    if (fn != null) {
      startTime = performance.now();
      console.log("[FM]", "Starting file save through websockets");
      path = window.localStorage.selectedServer + curDir + fn;
      randCode = genID(20);

      socket.emit("startFileWrite", {
        path: path,
        randCode: randCode,
      });
      console.log("[FM]", "emit startFileWrite");

      textSplit = text.split("\n");
      console.log(
        "[FM]",
        "Sending " + textSplit.length + " fragments of file through websockets"
      );
      textSplit.forEach(function (seg) {
        socket.emit("addFileWrite", {
          add: seg,
          randCode: randCode,
        });
      });

      socket.emit("finishFileWrite", {
        randCode: randCode,
      });
      console.log("[FM]", "emit finishFileWrite");
      endTime = performance.now();
      delta_sec = (endTime - startTime) / 1000;
      console.log("[PERF]", "Saving this file took " + delta_sec + " sec.");
      refreshDir();
    }
  });
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
