var PR_LIST_URL =
  "https://api.modrinth.com/v2/search?filters=categories=paper%20OR%20categories=spigot";
var PR_SEARCH_URL =
  "https://api.modrinth.com/v2/search?filters=categories=paper%20OR%20categories=spigot&query=$";
var PR_TABLE_PLACEHOLDER =
  '<tr class="bg-white dark:bg-gray-800 glassmorphed"> <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white max-w-sm tr-placeholder"> <div class="flex items-center"> <div class="flex items-center justify-center bg-gray-300 rounded dark:bg-gray-700" style="width: 64px; height: 64px" > <svg class="text-gray-200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="height: 32px; width: 32px;" fill="currentColor" viewBox="0 0 640 512" > <path d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z" /> </svg> </div> <div class="flex flex-col justify-center" style="margin-left: 16px" > <div class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4" ></div> <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px] mb-2.5" ></div> <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700" ></div> </div> </div> </th> <td></td> </tr>';
var PR_IMAGE_PLACEHOLDER =
  '<div class="flex items-center justify-center bg-gray-300 rounded dark:bg-gray-700" style="width: 64px; height: 64px" > <svg class="text-gray-200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="height: 32px; width: 32px;" fill="currentColor" viewBox="0 0 640 512" > <path d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z" /> </svg> </div>';
var currentPage = 0;
var limit = 20;

var currentMode = "";

$(document).ready(function () {
  if(window.localStorage.vmark__plrepo == null){
    showModal("plrepo-nodl-modal", "fadeIn")
    window.localStorage.setItem('vmark__plrepo', true);
  }
  $("#plugins-list").html("");
  for (var i = 0; i < 20; i++) {
    $("#plugins-list").append(PR_TABLE_PLACEHOLDER);
  }
  setTimeout(function () {
    loadPluginsList();
  }, 100);

  $("#search-input").keyup(function (e) {
    if ($(this).val() != "" && e.originalEvent.keyCode == 13) {
      searchPlugins();
    }
    if($(this).val() == ""){
      currentMode = "popular";
      currentPage = 0;
      loadPluginsList();
    }
  });

  $("#search-btn").click(function (e) {
    searchPlugins();
  });
});

function loadPluginsList() {
  $("#plugins-list").html("");
  for (var i = 0; i < 20; i++) {
    $("#plugins-list").append(PR_TABLE_PLACEHOLDER);
  }
  animateTopbar(25, 50);
  currentMode = "popular";
  $.get(PR_LIST_URL + "&offset=" + currentPage * limit, function (data) {
    animateTopbar(70, 50);
    $("#plugins-list").html("");
    fillTableFromData(data.hits);
    animateTopbar(100, 10);
    setTimeout(function () {
      animateTopbar(0, 5);
    }, 11);
  });
}

function searchPlugins() {
  if ($("#search-input").val().trim().length > 0) {
    $("#plugins-list").html("");
    for (var i = 0; i < 20; i++) {
      $("#plugins-list").append(PR_TABLE_PLACEHOLDER);
    }
    animateTopbar(25, 50);
    currentMode = "search";
    $.get(
      PR_SEARCH_URL.replace(/\$/gm, $("#search-input").val().trim()) +
        "&offset=" +
        currentPage * limit,
      function (data) {
        animateTopbar(70, 50);
        $("#plugins-list").html("");
        fillTableFromData(data.hits);
        animateTopbar(100, 10);
        setTimeout(function () {
          animateTopbar(0, 5);
        }, 11);
      }
    );
  } else {
    currentMode = "popular";
    currentPage = 0;
    loadPluginsList();
  }
}

function fillTableFromData(data){
  data.forEach((item) => {
    if (
      typeof item.icon_url !== "undefined"
    ) {
      imgCode =
        '<img style="height: 64px; width: 64px;" src="' +
        item.icon_url +
        '">';
    } else {
      imgCode = PR_IMAGE_PLACEHOLDER;
    }
    $("#plugins-list").append(
      '<tr class="bg-white dark:bg-gray-800 glassmorphed cursor-pointer"> <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white" onclick="window.open(`https://modrinth.com/plugin/' + item.slug + '`,`blank`)"> <div class="flex items-center"> ' + imgCode + ' <div class="flex flex-col justify-center" style="margin-left: 16px"> <span class="text-xl font-semibold">' +
        item.title +
        '</span> <span class="text-md mb-1 hide-on-mobile">' +
        item.description +
        '</span> <div class="flex items-center"> <i class="ri-download-line text-gray-400"></i> <span class="ml-1">' +
        item.downloads +
        '</span> <i class="ri-star-fill text-yellow-300 ml-3"></i> <span class="ml-1">' +
        item.follows +
        '</span> </div> </div> </div> </th> <td class="px-4" style="text-align: end;"></td> </tr>'
    );
  });
}

function nextPage() {
  if ($("#plugins-list tr").length > 0) {
    currentPage++;
  }
  if (currentMode == "popular") {
    loadPluginsList();
  } else if (currentMode == "search") {
    searchPlugins();
  }
}

function previousPage() {
  if (currentPage > 0) {
    currentPage--;
  }
  if (currentMode == "popular") {
    loadPluginsList();
  } else if (currentMode == "search") {
    searchPlugins();
  }
}