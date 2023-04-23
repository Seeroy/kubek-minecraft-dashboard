$(document).ready(function () {
  refreshLists();
});

function refreshLists() {
  $.get(
    "/plugins/installed?server=" + window.localStorage.selectedServer,
    function (data) {
      $("#installed-plugins-list").html("");
      data.forEach(function (plugin) {
        plugin_displayname = plugin.replaceAll(/\.jar|\.dis/gim, "").trim();
        if (plugin.match(/\.dis/gim) != null) {
          switchmode = "";
        } else {
          switchmode = " checked ";
        }
        $("#installed-plugins-list").append(
          '<li class="list-group-item px-4 d-flex flex-row align-items-center"><label class="switch" style="margin-right: 10px;"><input type="checkbox" onchange=changeAddonStatus(this) data-type="plugin" data-filename="' +
            plugin_displayname +
            '" role="switch"' +
            switchmode +
            '><span class="slider round"></span></label><span class="flex-fill">' +
            plugin_displayname +
            '</span><button class="btn btn-danger" onclick="deletePlugin(' +
            "'" +
            plugin +
            "'" +
            ')"><span class="material-symbols-outlined">delete</span></button></li>'
        );
      });
      $.get(
        "/plugins/installedMods?server=" + window.localStorage.selectedServer,
        function (data) {
          $("#installed-mods-list").html("");
          data.forEach(function (mod) {
            mod_displayname = mod.replaceAll(/\.jar|\.dis/gim, "").trim();
            if (mod.match(/\.dis/gim) != null) {
              switchmode = "";
            } else {
              switchmode = " checked ";
            }
            $("#installed-mods-list").append(
              '<li class="list-group-item px-4 d-flex flex-row align-items-center"><label class="switch" style="margin-right: 10px;"><input type="checkbox" onchange=changeAddonStatus(this) data-type="plugin" data-filename="' +
                plugin_displayname +
                '" role="switch"' +
                switchmode +
                '><span class="slider round"></span></label><span class="flex-fill">' +
                mod_displayname +
                '</span><button class="btn btn-danger" onclick="deleteMod(' +
                "'" +
                mod +
                "'" +
                ')"><span class="material-symbols-outlined">delete</span></button></li>'
            );
          });
          hideLoading();
        }
      );
    }
  );
}

function changeAddonStatus(switch_el) {
  add_type = $(switch_el).data("type");
  add_filename = $(switch_el).data("filename");

  $(switch_el).is(":checked") ? (add_status = "on") : (add_status = "off");

  console.log("[UI]", "Toggle", add_type, add_filename, "to", add_status);
  $.get(
    "/plugins/changeStatus?server=" +
      window.localStorage.selectedServer +
      "&type=" +
      add_type +
      "&file=" +
      add_filename +
      "&status=" +
      add_status,
    function (data) {
      refreshLists();
    }
  );
}

function deletePlugin(file) {
  showLoading();
  $.get(
    "/plugins/delete?server=" +
      window.localStorage.selectedServer +
      "&file=" +
      file,
    function () {
      refreshLists();
    }
  );
}

function deleteMod(file) {
  showLoading();
  $.get(
    "/plugins/deleteMod?server=" +
      window.localStorage.selectedServer +
      "&file=" +
      file,
    function () {
      refreshLists();
    }
  );
}

function uploadPlugin() {
  $("#g-plugin-input").trigger("click");
  $("#g-plugin-input").off("change");
  $("#g-plugin-input").change(function () {
    var formData = new FormData($("#g-plugin-form")[0]);
    jQuery.ajax({
      url: "/upload/plugin?server=" + window.localStorage.selectedServer,
      type: "POST",
      data: formData,
      success: function (data) {
        refreshLists();
      },
      error: function (data) {
        Toastify({
          text: "{{error-upload}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-danger)",
          },
        }).showToast();
        refreshLists();
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}

function uploadMod() {
  $("#g-mod-input").trigger("click");
  $("#g-mod-input").off("change");
  $("#g-mod-input").change(function () {
    var formData = new FormData($("#g-mod-form")[0]);
    jQuery.ajax({
      url: "/upload/mod?server=" + window.localStorage.selectedServer,
      type: "POST",
      data: formData,
      success: function (data) {
        refreshLists();
      },
      error: function (data) {
        Toastify({
          text: "{{error-upload}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "var(--mdb-danger)",
          },
        }).showToast();
        refreshLists();
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}
