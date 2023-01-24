$(document).ready(function () {
  refreshLists();
});

function refreshLists() {
  $.get("/plugins/installed?server=" + window.localStorage.selectedServer, function (data) {
    $("#installed-plugins-list").html("");
    data.forEach(function (plugin) {
      $("#installed-plugins-list").append('<li class="list-group-item px-4 d-flex flex-row align-items-center"><span class="flex-fill">' + plugin + '</span><button class="btn btn-danger" onclick="deletePlugin(' + "'" + plugin + "'" + ')"><span class="material-symbols-outlined">delete</span></button></li>');
    });
    $.get("/plugins/installedMods?server=" + window.localStorage.selectedServer, function (data) {
      $("#installed-mods-list").html("");
      data.forEach(function (plugin) {
        $("#installed-mods-list").append('<li class="list-group-item px-4 d-flex flex-row align-items-center"><span class="flex-fill">' + plugin + '</span><button class="btn btn-danger" onclick="deleteMod(' + "'" + plugin + "'" + ')"><span class="material-symbols-outlined">delete</span></button></li>');
      });
      hideLoading();
    });
  });
}

function deletePlugin(file) {
  showLoading();
  $.get("/plugins/delete?server=" + window.localStorage.selectedServer + "&file=" + file, function () {
    refreshLists();
  });
}

function deleteMod(file) {
  showLoading();
  $.get("/plugins/deleteMod?server=" + window.localStorage.selectedServer + "&file=" + file, function () {
    refreshLists();
  });
}

function uploadPlugin() {
  $("#g-plugin-input").trigger('click');
  $("#g-plugin-input").off("change");
  $("#g-plugin-input").change(function () {
    var formData = new FormData($("#g-plugin-form")[0]);
    jQuery.ajax({
      url: '/upload/plugin?server=' + window.localStorage.selectedServer,
      type: "POST",
      data: formData,
      success: function (data) {
        Swal.fire(
          '{{success}}',
          '{{restart-server-to-see-changes}}',
          'success'
        ).then((result) => {
          refreshLists();
        });
      },
      error: function (data) {
        Swal.fire(
          '{{error}}',
          '{{error-upload}}',
          'error'
        );
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}

function uploadMod() {
  $("#g-mod-input").trigger('click');
  $("#g-mod-input").off("change");
  $("#g-mod-input").change(function () {
    var formData = new FormData($("#g-mod-form")[0]);
    jQuery.ajax({
      url: '/upload/mod?server=' + window.localStorage.selectedServer,
      type: "POST",
      data: formData,
      success: function (data) {
        Swal.fire(
          '{{success}}',
          '{{restart-server-to-see-changes}}',
          'success'
        ).then((result) => {
          refreshLists();
        });
      },
      error: function (data) {
        Swal.fire(
          '{{error}}',
          '{{error-upload}}',
          'error'
        );
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}