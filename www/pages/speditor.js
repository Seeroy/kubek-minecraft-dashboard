$(document).ready(function () {
  refreshServerProperties();
});

function refreshServerProperties() {
  getSPTranslate(function (spt) {
    $.get(
      "/server/getServerPropertiesFile?server=" +
        window.localStorage.selectedServer,
      function (data) {
        keys = Object.keys(data);
        fulls = data;
        keys.forEach(function (key, i) {
          if (key != "generator-settings") {
            znach = fulls[key];
            if (typeof znach == "object") {
              znach = JSON.stringify(znach).replace("null", "").trim();
            }

            if (typeof spt[key] == "undefined") {
              spt[key] = "";
            }

            if (typeof znach == "boolean") {
              if (znach == true) {
                checkd = " checked";
              } else {
                checkd = "";
              }
              htmlcode =
                '<tr class="bg-white dark:bg-gray-800 glassmorphed" data-type="switch" style="vertical-align: middle;"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex flex-col justify-center"><span class="text-black dark:text-white key">' +
                key +
                '</span><span class="text-gray-600 dark:text-gray-400 text-sm font-light">' +
                spt[key] +
                '</span></div></th><td class="px-6 py-4"><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="ct' +
                i +
                '" name="ct' +
                i +
                '"' +
                checkd +
                ' class="sr-only peer">' +
                `<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div></label></td></tr>`;
            } else {
              if (key == "difficulty") {
                r = ["hard", "medium", "easy", "peaceful"];
                c = "";
                r.forEach(function (diff) {
                  if (diff == znach) {
                    c = c + "<option selected>" + diff + "</option>";
                  } else {
                    c = c + "<option>" + diff + "</option>";
                  }
                });

                htmlcode =
                  '<tr class="bg-white dark:bg-gray-800 glassmorphed" data-type="select" style="vertical-align: middle;"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex flex-col justify-center"><span class="text-black dark:text-white key">' +
                  key +
                  '</span><span class="text-gray-600 dark:text-gray-400 text-sm font-light">' +
                  spt[key] +
                  '</span></div></th><td class="px-6 py-4"><select class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500">' +
                  c +
                  "</select></td></tr>";
              } else if (key == "gamemode") {
                r = ["adventure", "survival", "creative"];
                c = "";
                r.forEach(function (diff) {
                  if (diff == znach) {
                    c = c + "<option selected>" + diff + "</option>";
                  } else {
                    c = c + "<option>" + diff + "</option>";
                  }
                });
                htmlcode =
                  '<tr class="bg-white dark:bg-gray-800 glassmorphed" data-type="select" style="vertical-align: middle;"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex flex-col justify-center"><span class="text-black dark:text-white key">' +
                  key +
                  '</span><span class="text-gray-600 dark:text-gray-400 text-sm font-light">' +
                  spt[key] +
                  '</span></div></th><td class="px-6 py-4"><select class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500">' +
                  c +
                  "</select></td></tr>";
              } else {
                htmlcode =
                  '<tr class="bg-white dark:bg-gray-800 glassmorphed" data-type="text" style="vertical-align: middle;"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex flex-col justify-center"><span class="text-black dark:text-white key">' +
                  key +
                  '</span><span class="text-gray-600 dark:text-gray-400 text-sm font-light">' +
                  spt[key] +
                  '</span></div></th><td class="px-6 py-4"><input type="text" value="' +
                  znach +
                  '" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"></td></tr>';
              }
            }
            $(".speditor-container table tbody").append(htmlcode);
          }
        });
        $(".addtooltip").each(function () {
          new mdb.Tooltip(this);
        });
      }
    );
  });
}

function getSPTranslate(cb) {
  $.get("/kubek/getSPTranslate", function (data) {
    cb(data);
  });
}

function saveProps() {
  var sp = "";
  $(".speditor-container table tbody tr").each(function () {
    key = $(this).find(".key").html();
    if ($(this).data("type") == "switch") {
      chk = $(this).find("input").is(":checked") ? true : false;
      if (sp !== "") {
        sp = sp + "\n" + key + "=" + chk;
      } else {
        sp = key + "=" + chk;
      }
    } else {
      value = $(this).find("input").val();
      if (key == "difficulty" || key == "gamemode") {
        value = $(this).find("select option:selected").text();
      }
      sp = sp + "\n" + key + "=" + value;
    }
  });
  sp = sp.trim();
  $.get(
    "/server/saveServerPropertiesFile?doc=" +
      encodeURIComponent(sp) +
      "&server=" +
      window.localStorage.selectedServer
  );
  Toaster("{{settings-saved}}", 3000, false, "success", true);
}
