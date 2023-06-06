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
          `<tr class="bg-white dark:bg-gray-800 glassmorphed" data-type='plugin' data-filename='` +
            plugin_displayname +
            `'><th scope="row" class="w-full px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><label class="relative inline-flex items-center cursor-pointer"><input onchange=changeAddonStatus(this) type="checkbox" ` +
            switchmode +
            ` class="sr-only peer"><div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div><span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">` +
            plugin_displayname +
            `</span></label></th><td class="px-6 py-4"><button type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-red-600 dark:hover:bg-red-700" onclick="deletePlugin('` +
            plugin +
            `')">{{delete}}</button></td></tr>`
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
              `<tr class="bg-white dark:bg-gray-800 glassmorphed" data-type='mod' data-filename='` +
                mod_displayname +
                `'><th scope="row" class="w-full px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><label class="relative inline-flex items-center cursor-pointer"><input onchange=changeAddonStatus(this) type="checkbox" ` +
                switchmode +
                ` class="sr-only peer"><div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div><span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">` +
                mod_displayname +
                `</span></label></th><td class="px-6 py-4"><button type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-red-600 dark:hover:bg-red-700" onclick="deleteMod('` +
                mod +
                `')">{{delete}}</button></td></tr>`
            );
          });
        }
      );
    }
  );
}

function changeAddonStatus(switch_el) {
  add_type = $(switch_el).parent().parent().parent().data("type");
  add_filename = $(switch_el).parent().parent().parent().data("filename");

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
      setTimeout(function () {
        refreshLists();
      }, 550);
    }
  );
}

function deletePlugin(file) {
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
        Toaster("{{error-upload}}", 3000, false, "error");
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
        Toaster("{{error-upload}}", 3000, false, "error");
        refreshLists();
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  });
}
