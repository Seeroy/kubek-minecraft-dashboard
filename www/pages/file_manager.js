var curDir = "/";

$(document).ready(function () {
  qss = window.location.search;
  params = new URLSearchParams(qss);
  fm_act = params.get('fm_act');
  if(fm_act == "logs"){
    curDir = "/logs/";
  }
  refreshDir();
});

function upperDir() {
  curDir = curDir.split("/");
  curDir.pop();
  curDir.pop();
  curDir = curDir.join("/") + "/";
  refreshDir();
}

function deleteFM(path) {
  fn = path.split("/").slice(-1)[0];

  Swal.fire({
    title: '{{aredelete-fm}}',
    text: fn,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: '{{yesdelete-fm}}',
    cancelButtonText: '{{cancel}}',
  }).then((result) => {
    if (result.isConfirmed) {
      $.get("/fmapi/deleteFile?server=" + window.localStorage.selectedServer + "&path=" + path, function () {
        refreshDir();
      });
    }
  })
}

function newdirFM() {
  Swal.fire({
    title: '{{new-directory-fm}}',
    input: 'text',
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: '{{create}}',
    cancelButtonText: '{{cancel}}',
    showLoaderOnConfirm: false,
    preConfirm: (login) => {
      return fetch("/fmapi/newDirectory?server=" + window.localStorage.selectedServer + "&path=" + curDir + "&newdir=" + btoa(login))
        .then(response => {
          if (!response.ok) {
            throw new Error(response.statusText)
          }
          return response.json()
        })
        .catch(error => {
          Swal.showValidationMessage(
            `Request failed: ${error}`
          )
        })
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      refreshDir();
    }
  })
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
        Swal.fire(
          '{{success}}',
          'success'
        ).then((result) => {
          refreshDir();
        });
      },
      error: function (data) {
        Swal.fire(
          '{{error}}',
          'error'
        );
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}

function renameFM(path) {
  fn = path.split("/").slice(-1)[0];

  Swal.fire({
    title: '{{dorename-fm}} ' + fn + "?",
    input: 'text',
    inputValue: fn,
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: '{{rename}}',
    cancelButtonText: '{{cancel}}',
    showLoaderOnConfirm: false,
    preConfirm: (new_fname) => {
      return fetch("/fmapi/renameFile?server=" + window.localStorage.selectedServer + "&path=" + path + "&newname=" + btoa(new_fname))
        .then(response => {
          if (!response.ok) {
            throw new Error(response.statusText)
          }
          return response.json()
        })
        .catch(error => {
          Swal.showValidationMessage(
            `Request failed: ${error}`
          )
        })
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      refreshDir();
    }
  })
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

  textSplit = $("#feModal .modal-body textarea").val().split("\n");
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
  $("#fm-table").html("");
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
    $("#fm-table").append(
      '<tr ondblclick="upperDir()"><td></td><td class="fn">..</td><td></td><td></td></tr>');
  }
  $.get("/fmapi/scanDirectory?server=" + window.localStorage.selectedServer + "&directory=" + curDir, function (data) {
    data = JSON.parse(data);
    if (typeof data == "object") {
      data.forEach(function (file) {
        size = 0;
        if (file.size < 1024 * 1024) {
          size = Math.round(file.size / 1024 * 10) / 10 + " Kb";
        }
        if (file.size < 1024) {
          size = file.size + " B";
        }
        if (file.size >= 1024 * 1024) {
          size = Math.round(file.size / 1024 / 1024 * 10) / 10 + " Mb";
        }
        if (file.size >= 1024 * 1024 * 1024) {
          size = Math.round(file.size / 1024 / 1024 / 1024 * 10) / 10 + " Gb";
        }
        if (file.type == "directory") {
          act =
            '<button type="button" onclick=renameFM("' +
            curDir + file.name +
            '")><span style="font-size: 10pt;" class="material-symbols-outlined">border_color</span></button>';
        } else {
          act =
            '<button type="button" onclick=deleteFM("' +
            curDir + file.name +
            '")><span style="font-size: 10pt;" class="material-symbols-outlined">delete</span></button><button type="button" onclick=renameFM("' +
            curDir + file.name +
            '")><span style="font-size: 10pt;" class="material-symbols-outlined">border_color</span></button><button type="button" onclick=downloadFM("' +
            curDir + file.name +
            '")><span style="font-size: 10pt;" class="material-symbols-outlined">download</span></button>';
        }
        if (file.type == "directory") {
          icon = "folder";
        } else if (file.type == "file") {
          icon = "description";
        } else {
          icon = "question_mark";
        }
        if (file.type == "directory") {
          size = "";
        }
        $("#fm-table").append(
          '<tr data-type="' + file.type +
          '"><td style="width: 20px;"><span class="material-symbols-outlined">' + icon +
          '</span></td><td class="fn">' +
          file.name + '</td><td>' + size + '</td><td class="buttons-td">' + act + '</td></tr>');
      });
      $("#fm-table").unbind("click");
      $("#fm-table tr").dblclick(function () {
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
                $("#feModal .modal-body textarea").val(data);
                myModal = new mdb.Modal(document.getElementById('feModal'));
                myModal.show();
              });
          }
        }
      });
    }
  });
}