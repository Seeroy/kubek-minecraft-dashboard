var bks_st_start = '{{backups-status-started}}';
var bks_st_err = '{{backups-status-error}}';
var bks_st_proc = '{{backups-status-processing}}';

var bks_tp_full = '{{backups-type-full}}';
var bks_tp_sel = '{{backups-type-selected}}';

var rks = {};

$(document).ready(function () {
  refreshBackupsList();
  $("input[name='backupTypeRadio']").change(function () {
    if (this.value == "full") {
      $(".flt-parent").hide();
    } else if (this.value == "selected") {
      refreshServerFilesList();
      $(".flt-parent").show();
    }
  });

  $("#newBackupModal .btn-primary").click(function () {
    bname = $("#bcname-input").val();
    desc = $("#bcdesc-input").val();
    ratio = $("#backupCompressRatio").val();
    type = $("input[name='backupTypeRadio']:checked")[0].value;
    if (type == "selected") {
      files = [];
      $("#fl-table tr").each(function (i, cb) {
        if ($(cb).find(".fsboxes").is(":checked")) {
          r = {
            name: $(cb).find(".fn").text(),
            type: $(cb).data('type')
          }
          files.push(r);
        }
      });
      $.get("/backups/new?name=" + bname + "&desc=" + desc + "&files=" + encodeURIComponent(JSON.stringify(files)) + "&type=" + type + "&sn=" + window.localStorage.selectedServer + "&ratio=" + ratio);
    } else {
      $.get("/backups/new?name=" + bname + "&desc=" + desc + "&type=" + type + "&sn=" + window.localStorage.selectedServer + "&ratio=" + ratio);
    }
  });
});

function setPercentage(percentage) {
  $("#usage-disk-percent").text(percentage + '%');
  $("#usage-disk-pbar").css("width", percentage + '%');
}

function refreshServerFilesList() {
  $("#fl-table").html("");
  $.get("/fmapi/scanDirectory?server=" + window.localStorage.selectedServer + "&directory=/", function (data) {
    data = JSON.parse(data);
    data = sortToDirsAndFiles(data);
    if (typeof data == "object") {
      data.forEach(function (file, i) {
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
        cb = '<div><input class="form-check-input fsboxes" type="checkbox" id="fsbox_' + i + '" value="sel"/></div>';
        $("#fl-table").append(
          '<tr data-type="' + file.type +
          '"><td style="width: 20px;">' + cb + '</td><td style="width: 20px;"><img height="64px" src="/assets/fm_icons/' + icon +
          '"></td><td class="fn">' +
          file.name + '</td></tr>');
      });
    }
  });
}

function refreshDiskStats() {
  $.get("/backups/diskStats", function (data) {
    if (data != false && data != "error") {
      total = Math.round(data['_blocks'] / 1024 / 1024 / 1024);
      free = Math.round(data['_available'] / 1024 / 1024 / 1024);
      used = Math.round(data['_used'] / 1024 / 1024 / 1024);
      percent = data['_capacity'];
      $("#disk-total-size").text(total + " GB");
      $("#disk-free-size").text(free + " GB");
      $("#disk-used-size").text(used + " GB");
      $("#usage-disk-percent").text(percent);
      $("#usage-disk-pbar").css("width", percent);
    }
  });
}

function restoreBackup(fn) {
  Swal.fire({
    title: '{{backup-candestroy}}',
    showDenyButton: false,
    showCancelButton: true,
    confirmButtonText: '{{ok}}',
  }).then((result) => {
    if (result.isConfirmed) {
      $("#restoreBackupModal .modal-body").text("{{backups-restorproc}}");
      myModal = new mdb.Modal(document.getElementById('restoreBackupModal'));
      myModal.show();
      $.ajax({
        url: "/backups/restore?filename=" + fn + "&server=" + window.localStorage.selectedServer,
        error: function (err) {
          $("#restoreBackupModal .modal-body").text("Error happend:" + err.toString());
        },
        success: function () {
          window.location.reload();
        },
        timeout: 500000
      });
    }
  })
}

function showBackupInfo(bname, desc) {
  if(rks[bname] != null){
    text = "<ol>";
    rks[bname].forEach(function (file) {
      text = text + "<li>" + file.name + "</li>";
    });
    text = text + "</ol>"
  } else {
    text = "";
  }
  if(desc != ""){
    text_html = "<p>{{description}}: " + desc + "</p>" + text;
  } else {
    text_html = "<p>{{no-description}}</p>" + text;
  }
  $("#backup-info-modal .caption").text(bname);
  $("#backup-info-modal .inner-content").html(text_html);
  showModal("backup-info-modal", "fadeIn", refreshBackupsList);
}

function refreshBackupsList() {
  refreshDiskStats();
  $("#backups-list").html("");
  $.get("/backups/list", function (data) {
    if (typeof data == "object") {
      data.forEach(function (item, i) {
        size = item.size;
        if (item.size < 1024) {
          size = item.size + " B";
        }
        if (item.size < 1024 * 1024) {
          size = Math.round(item.size / 1024 * 10) / 10 + " Kb";
        }
        if (item.size >= 1024 * 1024) {
          size = Math.round(item.size / 1024 / 1024 * 10) / 10 + " Mb";
        }
        if (item.size >= 1024 * 1024 * 1024) {
          size = Math.round(item.size / 1024 / 1024 / 1024 * 10) / 10 + " Gb";
        }
        clr = "";
        if (typeof item.processing_status == "undefined" || item.processing_status.status == "completed") {
          name_badge = "";
          name_size = "<span class='ms-2 gray-addon' style='font-family: monospace;'>" + size + "</span>";
          rr = '';
          clr = " color: white;";
          icn = "cloud_done";
        } else {
          if (item.processing_status.status == "processing") {
            name_badge = '<span class="badge rounded-pill badge-primary text-primary ms-2">' + bks_st_proc + ' (' + item.processing_status.percent + '%)</span>';
            name_size = "";
            rr = '';
            prcc = 100 - item.processing_status.percent;
            clr = ' background: -webkit-linear-gradient(var(--mdb-gray-400) ' + prcc + '%, var(--mdb-primary) ' + prcc + '%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;';
            icn = "backup"
          } else if (item.processing_status.status == "error") {
            name_badge = '<span class="badge rounded-pill badge-primary text-danger ms-2">' + bks_st_error + '</span>';
            name_size = "";
            rr = '<span style="margin: 0 8px; color: rgb(200,200,200)">|</span><span>{{backups-text-status}}: ' + bks_st_error + ' ' + item.processing_status.error.code + '</span>';
            clr = " color: red;";
            icn = "cloud_off";
          } else {
            name_badge = '<span class="badge rounded-pill badge-primary text-primary ms-2">' + bks_st_start + '</span>';
            name_size = "";
            rr = '<span style="margin: 0 8px; color: rgb(200,200,200)">|</span><span>{{backups-text-status}}: ' + bks_st_start + '</span><span style="margin: 0 8px; color: rgb(200,200,200)">|</span>';
            clr = " color: white;";
            icn = "cloud_done";
          }
        }
        if (item.type == "full") {
          bkt = bks_tp_full;
        } else {
          bkt = bks_tp_sel;
        }
        rks[item.name] = item.selected_files;
        $("#backups-list").append('<li class="list-group-item px-3 w-100 border-0 rounded-3 list-group-item-light mb-2 d-flex flex-row align-items-center text-white"><span class="material-symbols-outlined" style="font-size: 48px; margin-right: 24px;' + clr + '">' + icn + '</span><div class="d-flex flex-column justify-content-center flex-fill"><span style="font-size: 17pt; font-weight: 600;">' + item.name + name_badge + name_size + '</span><div class="d-flex flex-row align-items-center gray-addon"><span>{{selected-sn-sw}}: ' + item.server + '</span>' + rr + '</div></div><button class="btn btn-warning btn-lg" onclick="showBackupInfo(' + "'" + item.name + "'" + ', ' + "'" + item.description + "'" + ')"><span class="material-symbols-outlined">info</span></button><button class="btn btn-danger btn-lg" onclick="$.get(' + "'/backups/delete?filename=" + item.archive_name + "'" + '); refreshBackupsList();"><span class="material-symbols-outlined">delete</span></button><button class="btn btn-primary btn-lg" onclick="window.location=' + "'/backups/download?filename=" + item.archive_name + "'" + '"><span class="material-symbols-outlined">download</span></button><button class="btn btn-info btn-lg" onclick="restoreBackup(' + "'" + item.archive_name + "'" + ')"><span class="material-symbols-outlined">settings_backup_restore</span></button></li>');
      });
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