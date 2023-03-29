/* Loader */
function showLoading() {
  $("#loading-overlay").show();
}

function hideLoading() {
  $("#loading-overlay").fadeOut(150, function () {
    $("#loading-overlay").hide();
  });
}

/* Modal functions */
function showModal(id, anim, cb) {
  $("#" + id).show();
  animateCSS("#" + id + " .modal-layout", anim);
  $("#" + id + " .modal-layout .clsbtn").unbind("click");
  $("#" + id + " .modal-layout .clsbtn").click(function(e){
    hideModal(id);
    cb(e);
  });
}

function hideModal(id) {
  $("#" + id + " .modal-layout .clsbtn").unbind("click");
  $("#" + id).fadeOut(100, function () {
    $("#" + id).hide();
  });
}

function openSocket() {
  return io("ws://" + window.location.hostname + ":3001");
}

function updateURLParameter(url, param, paramVal) {
  var newAdditionalURL = "";
  var tempArray = url.split("?");
  var baseURL = tempArray[0];
  var additionalURL = tempArray[1];
  var temp = "";
  if (additionalURL) {
    tempArray = additionalURL.split("&");
    for (var i = 0; i < tempArray.length; i++) {
      if (tempArray[i].split('=')[0] != param) {
        newAdditionalURL += temp + tempArray[i];
        temp = "&";
      }
    }
  }

  var rows_txt = temp + "" + param + "=" + paramVal;
  return baseURL + "?" + newAdditionalURL + rows_txt;
}

function setPageURL(page) {
  window.history.replaceState('', '', updateURLParameter(window.location.href, "act", page));
}

function gotoPage(page) {
  $.get("/auth/permissions", function (perms) {
    if (page == "console" && !perms.includes("console")) {
      gotoPage("access_blocked")
    } else if (page == "mods" && !perms.includes("plugins")) {
      gotoPage("access_blocked")
    } else if (page == "file_manager" && !perms.includes("filemanager")) {
      gotoPage("access_blocked")
    } else if (page == "server_settings" && !perms.includes("server_settings")) {
      gotoPage("access_blocked")
    } else if (page == "kubek_settings" && !perms.includes("kubek_settings")) {
      gotoPage("access_blocked")
    } else {
      console.log("[UI]", "Trying to load page:", page);
      queryStringg = window.location.search;
      urlParamss = new URLSearchParams(queryStringg);
      act = urlParamss.get('act');
      showLoading();
      setPageURL(page);
      $.ajax({
        url: "/pages/" + page + ".html" + queryStringg,
        success: function (result) {
          console.log("[UI]", "We got page content");
          $(".content").html(result);
          socket.emit("update", {
            type: "servers"
          });
          $("#server-name").text(window.localStorage.selectedServer);
          $("#server-icon").attr("src", "/server/icon?server=" + window.localStorage.selectedServer);
          setTimeout(() => {
            hideLoading();
          }, 200);
        },
        error: function (error) {
          console.error("[UI]", "Error happend when loading page:", error.status, error.statusText);
          gotoPage('console');
          setTimeout(() => {
            hideLoading();
          }, 200);
        }
      });
      setUnactiveSidebarItem();
      setActiveSidebarItem(page);
    }
  });
}

function logoutUser() {
  window.location = "/auth/logout";
}

function gotoPageWithAttr(page, skipcheck, attr) {
  queryString = window.location.search;
  urlParams = new URLSearchParams(queryString);
  act = urlParams.get('act');
  showLoading();
  $.ajax({
    url: "/pages/" + page + ".html" + attr,
    success: function (result) {
      $(".content").html(result);
      setTimeout(() => {
        hideLoading();
      }, 200);
    },
    error: function () {
      gotoPage('console');
      setTimeout(() => {
        hideLoading();
      }, 200);
    }
  });
  setUnactiveSidebarItem();
  setActiveSidebarItem(page);
}

function setUnactiveSidebarItem() {
  $("#sidebar-menu-list .active").removeClass("active");
  $("#sidebar-menu-list .active").attr("aria-current", "");
}

function setActiveSidebarItem(pg) {
  $("#sidebar-menu-list .list-group-item").each(function () {
    if ($(this).data("page") == pg) {
      $(this).addClass("active");
      $(this).attr("aria-current", "true");
    }
  });
}

function startServer() {
  $.get("/server/start?server=" + window.localStorage.selectedServer);
}

function stopServer() {
  $.get("/server/statuses", function (sstat) {
    if (typeof sstat[window.localStorage.selectedServer] !== "undefined" && typeof sstat[window.localStorage.selectedServer]['stopCommand'] !== "undefined") {
      $.get("/server/sendCommand?server=" + window.localStorage.selectedServer + "&cmd=" + sstat[window.localStorage.selectedServer]['stopCommand']);
    } else {
      $.get("/server/sendCommand?server=" + window.localStorage.selectedServer + "&cmd=stop");
    }
  });
}

function restartServer() {
  $.get("/server/restart?server=" + window.localStorage.selectedServer);
}

function killServer() {
  showModal("kill-server-modal", "zoomIn", function(){
    $.get("/server/kill?server=" + window.localStorage.selectedServer);
  });
}

const animateCSS = (element, animation, prefix = 'animate__') =>
  new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);

    node.classList.add(`${prefix}animated`, animationName, `${prefix}faster`);

    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(`${prefix}animated`, animationName, `${prefix}faster`);
      resolve('Animation ended');
    }

    node.addEventListener('animationend', handleAnimationEnd, {
      once: true
    });
  });

function convertFileSizeToHuman(size) {
  if (size < 1024) {
    size = size + " B";
  } else if (size < 1024 * 1024) {
    size = Math.round(size / 1024 * 10) / 10 + " Kb";
  } else if (size >= 1024 * 1024 && size < 1024 * 1024 * 1024) {
    size = Math.round(size / 1024 / 1024 * 10) / 10 + " Mb";
  } else if (size >= 1024 * 1024 * 1024) {
    size = Math.round(size / 1024 / 1024 / 1024 * 10) / 10 + " Gb";
  } else {
    size = size + " ?";
  }
  return size;
}