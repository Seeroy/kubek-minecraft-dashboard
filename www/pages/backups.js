var bks_st_start = "{{backups-status-started}}";
var bks_st_err = "{{backups-status-error}}";
var bks_st_proc = "{{backups-status-processing}}";

var bks_tp_full = "{{backups-type-full}}";
var bks_tp_sel = "{{backups-type-selected}}";

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

  $("#create-backup-btn").click(function () {
    $("#bcname-input").val("");
    $("#bcdesc-input").val("");
    showModal("new-backup-modal", "fadeIn", function () {
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
              type: $(cb).data("type"),
            };
            files.push(r);
          }
        });
        $.get(
          "/backups/new?name=" +
            bname +
            "&desc=" +
            desc +
            "&files=" +
            encodeURIComponent(JSON.stringify(files)) +
            "&type=" +
            type +
            "&sn=" +
            window.localStorage.selectedServer +
            "&ratio=" +
            ratio
        );
      } else {
        $.get(
          "/backups/new?name=" +
            bname +
            "&desc=" +
            desc +
            "&type=" +
            type +
            "&sn=" +
            window.localStorage.selectedServer +
            "&ratio=" +
            ratio
        );
      }
    });
  });
});

function setPercentage(percentage) {
  $("#usage-disk-percent").text(percentage + "%");
  $("#usage-disk-pbar").css("width", percentage + "%");
}

function refreshServerFilesList() {
  $.get(
    "/fmapi/scanDirectory?server=" +
      window.localStorage.selectedServer +
      "&directory=/",
    function (data) {
      data = JSON.parse(data);
      data = sortToDirsAndFiles(data);
      if (typeof data == "object") {
		$("#fl-table").html("");
        data.forEach(function (file, i) {
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
          cb =
            '<div><input class="form-check-input fsboxes" type="checkbox" id="fsbox_' +
            i +
            '" value="sel"/></div>';
          $("#fl-table").append(
            '<tr data-type="' +
              file.type +
              '"><td style="width: 20px;">' +
              cb +
              '</td><td style="width: 20px;"><img height="64px" src="/assets/fm_icons/' +
              icon +
              '"></td><td class="fn text-black dark:text-white ml-2" style="display: block;">' +
              file.name +
              "</td></tr>"
          );
        });
      }
    }
  );
}

function refreshDiskStats() {
  $.get("/backups/diskStats", function (data) {
    if (data != false && data != "error") {
      total = Math.round(data["_blocks"] / 1024 / 1024 / 1024);
      free = Math.round(data["_available"] / 1024 / 1024 / 1024);
      used = Math.round(data["_used"] / 1024 / 1024 / 1024);
      percent = data["_capacity"];
      $("#disk-total-size").text(total + " GB");
      $("#disk-free-size").text(free + " GB");
      $("#disk-used-size").text(used + " GB");
      $(".backups-container .progress-bar").css(
        "--progVal",
        '"' + percent + '"'
      );
      $(".backups-container .progress-bar").css(
        "background",
        "radial-gradient(closest-side, #1f2937 79%, transparent 80% 100%), conic-gradient(#1c64f2 " +
          percent +
          ", #4b5563 0)"
      );
    }
  });
}

function restoreBackup(fn) {
  showModal("ask-restore-backup-modal", "fadeIn", function () {
    Toaster("{{backups-restorproc}}", -1, false, "");
    $.ajax({
      url:
        "/backups/restore?filename=" +
        fn +
        "&server=" +
        window.localStorage.selectedServer,
      error: function (err) {
        Toaster("Error happend: " + err.toString(), 5000, false, "error");
      },
      success: function () {
        window.location.reload();
      },
      timeout: 500000,
    });
  });
}

function showBackupInfo(bname, desc) {
  if (rks[bname] != null) {
    text = "<ol>";
    rks[bname].forEach(function (file) {
      text = text + "<li>" + file.name + "</li>";
    });
    text = text + "</ol>";
  } else {
    text = "";
  }
  if (desc != "") {
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
  $.get("/backups/list", function (data) {
    if (typeof data == "object") {
      $("#backups-list").html("");
      data.forEach(function (item, i) {
        size = item.size;
        if (item.size < 1024) {
          size = item.size + " B";
        }
        if (item.size < 1024 * 1024) {
          size = Math.round((item.size / 1024) * 10) / 10 + " Kb";
        }
        if (item.size >= 1024 * 1024) {
          size = Math.round((item.size / 1024 / 1024) * 10) / 10 + " Mb";
        }
        if (item.size >= 1024 * 1024 * 1024) {
          size = Math.round((item.size / 1024 / 1024 / 1024) * 10) / 10 + " Gb";
        }

        backup_name =
          '<span class="text-black dark:text-white text-3xl font-semibold">' +
          item.name +
          "</span>";
        backup_status =
          '<span class="text-gray-600 dark:text-gray-400 text-md font-light"><i class="ri-instance-fill mr-2"></i>{{status}}: <span class="text-gray-900 dark:text-white">$1</span></span>';
        backup_size =
          '<span class="text-gray-600 dark:text-gray-400 text-md font-light"><i class="ri-pie-chart-2-fill mr-2"></i>{{tb-size-fm}}: <span class="text-gray-900 dark:text-white">$1</span></span>';
        backup_type =
          '<span class="text-gray-600 dark:text-gray-400 text-md font-light"><i class="ri-survey-fill mr-2"></i>{{backups-text-type}}: <span class="text-gray-900 dark:text-white">$1</span></span>';
        backup_server_name =
          '<span class="text-gray-600 dark:text-gray-400 text-md font-light"><i class="ri-server-fill mr-2"></i>{{selected-sn-sw}}: <span class="text-gray-900 dark:text-white">' +
          item.server +
          "</span></span>";
        backup_buttons =
          '<button class="focus:outline-none text-white bg-yellow-400 hover:bg-yellow-500 font-medium rounded-lg text-sm px-5 py-2.5 mr-2" onclick="showBackupInfo(' +
          "'" +
          item.name +
          "'" +
          ", " +
          "'" +
          item.description +
          "'" +
          ')"><i class="ri-information-line text-2xl"></i></button><button class="focus:outline-none text-white bg-red-500 hover:bg-red-600 font-medium rounded-lg text-sm px-5 py-2.5 mr-2" onclick="$.get(' +
          "'/backups/delete?filename=" +
          item.archive_name +
          "'" +
          '); refreshBackupsList();"><i class="ri-delete-bin-6-line text-2xl"></i></button><button class="focus:outline-none text-white bg-blue-500 hover:bg-blue-600 font-medium rounded-lg text-sm px-5 py-2.5 mr-2" onclick="window.location=' +
          "'/backups/download?filename=" +
          item.archive_name +
          "'" +
          '"><i class="ri-file-download-line text-2xl"></i></button><button class="focus:outline-none text-white bg-purple-500 hover:bg-purple-600 font-medium rounded-lg text-sm px-5 py-2.5" onclick="restoreBackup(' +
          "'" +
          item.archive_name +
          "'" +
          ')"><i class="ri-restart-line text-2xl"></i></button>';

        main_item_style = "";

        if (
          typeof item.processing_status !== "undefined" &&
          typeof item.processing_status.status !== "undefined"
        ) {
          switch (item.processing_status.status) {
            case "processing":
              backup_status = backup_status.replace(
                /\$1/gim,
                bks_st_proc + " (" + item.processing_status.percent + "%)"
              );
              backup_size = backup_size.replace(/\$1/gim, "{{unknown}}");
              backup_type = backup_type.replace(/\$1/gim, "{{unknown}}");
              main_item_style =
                "background: linear-gradient(90deg, rgba(28,100,242,0.5) " +
                item.processing_status.percent +
                "%, rgba(41,41,41,0.2) " +
                item.processing_status.percent +
                "%) !important;";
              backup_buttons = "";
              break;
            case "error":
              backup_status = backup_status.replace(
                /\$1/gim,
                bks_st_err +
                  " (code: " +
                  item.processing_status.error.code +
                  ")"
              );
              backup_size = backup_size.replace(/\$1/gim, "{{unknown}}");
              backup_type = backup_type.replace(/\$1/gim, "{{unknown}}");
              backup_buttons = "";
              break;
            default:
              backup_status = backup_status.replace(/\$1/gim, "OK");
              backup_size = backup_size.replace(/\$1/gim, size);
              if (item.type == "full") {
                bkt = bks_tp_full;
              } else {
                bkt = bks_tp_sel;
              }
              backup_type = backup_type.replace(/\$1/gim, bkt);
              break;
          }
        } else {
          backup_status = backup_status.replace(/\$1/gim, "OK");
          backup_size = backup_size.replace(/\$1/gim, size);
          if (item.type == "full") {
            bkt = bks_tp_full;
          } else {
            bkt = bks_tp_sel;
          }
          backup_type = backup_type.replace(/\$1/gim, bkt);
        }

        $("#backups-list").append(
          '<tr class="bg-white dark:bg-gray-800 glassmorphed" style="' +
            main_item_style +
            '"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex flex-col justify-center">' +
            backup_name +
            backup_status +
            backup_type +
            backup_size +
            backup_server_name +
            '</div></th><td class="px-6 py-4" style="text-align: end;">' +
            backup_buttons +
            "</td></tr>"
        );
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
