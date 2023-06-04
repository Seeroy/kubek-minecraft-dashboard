/* Modal functions */
function showModal(id, anim, cb, bindToInput = false) {
  $("#" + id).show();
  animateCSS("#" + id + " .modal-layout", anim);
  $("#" + id + " .modal-layout .clsbtn").unbind("click");
  $("#" + id + " .modal-layout .clsbtn").click(function (e) {
    hideModal(id);
    cb(e);
  });
  if (bindToInput == true) {
    $("#" + id + " .modal-layout input")
      .eq(0)
      .focus();
    $("#" + id + " .modal-layout input").keydown(function (e) {
      if (e.key == "Enter") {
        hideModal(id);
        cb(e);
      }
    });
  }
}

function hideModal(id) {
  $("#" + id + " .modal-layout .clsbtn").unbind("click");
  $("#" + id).fadeOut(100, function () {
    $("#" + id).hide();
  });
}

function openSocket(port) {
  return io("ws://" + window.location.hostname + ":" + port);
}

function toggleMobileMenu() {
  if ($(".menuContainer").hasClass("opened")) {
    animateCSS(".menuContainer", "fadeOutLeft").then((message) => {
      $(".menuContainer").removeClass("opened");
    });
  } else {
    animateCSS(".menuContainer", "slideInLeft");
    $(".menuContainer").addClass("opened");
  }
}

function hideMobileMenu() {
  if ($(".menuContainer").hasClass("opened")) {
    animateCSS(".menuContainer", "fadeOutLeft").then((message) => {
      $(".menuContainer").removeClass("opened");
    });
  }
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
      if (tempArray[i].split("=")[0] != param) {
        newAdditionalURL += temp + tempArray[i];
        temp = "&";
      }
    }
  }

  var rows_txt = temp + "" + param + "=" + paramVal;
  return baseURL + "?" + newAdditionalURL + rows_txt;
}

function setPageURL(page) {
  window.history.replaceState(
    "",
    "",
    updateURLParameter(window.location.href, "act", page)
  );
}

function gotoPage(page) {
  animateTopbar(25, 50);
  $.get("/auth/permissions", function (perms) {
    animateTopbar(90, 50);
    if (page == "console" && !perms.includes("console")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (page == "mods" && !perms.includes("plugins")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (page == "file_manager" && !perms.includes("filemanager")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (
      page == "server_settings" &&
      !perms.includes("server_settings")
    ) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else if (page == "kubek_settings" && !perms.includes("kubek_settings")) {
      gotoPage("access_blocked");
      animateTopbar(0, 50);
    } else {
      console.log("[UI]", "Trying to load page:", page);
      setPageURL(page);
      $.ajax({
        url: "/pages/" + page + ".html",
        success: function (result) {
          console.log("[UI]", "We got page content");
          $("#content-place").html(result);
          socket.emit("update", {
            type: "servers",
          });
          $("#server-name").text(window.localStorage.selectedServer);
          $("#server-icon").attr(
            "src",
            "/server/icon?server=" + window.localStorage.selectedServer
          );
          animateTopbar(100, 50);
          setTimeout(() => {
            animateTopbar(0, 50);
          }, 200);
        },
        error: function (error) {
          console.error(
            "[UI]",
            "Error happend when loading page:",
            error.status,
            error.statusText
          );
          animateTopbar(0, 15);
          gotoPage("console");
        },
      });
      setUnactiveTabMenu();
      setActiveTabMenuByPage(page);
    }
  });
}

function animateTopbar(percent, time){
  $("#topbar div").stop();
  $("#topbar div").animate({width: percent + "%"}, time);
}

function logoutUser() {
  window.location = "/auth/logout";
}

function setUnactiveTabMenu() {
  addel = $("#menu-tabs-list li button.active");
  $(addel).removeClass();
  $(addel).addClass(
    "inline-flex p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group"
  );
}

function setActiveTabMenuByElement(elem) {
  $(elem).removeClass();
  $(elem).addClass(
    "active inline-flex p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500 group"
  );
}

function setActiveTabMenuByPage(pg) {
  $("#menu-tabs-list li button").each(function () {
    if ($(this).data("page") == pg) {
      $(this).removeClass();
      $(this).addClass(
        "active inline-flex p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500 group"
      );
    }
  });
}

function startServer() {
  $.get("/server/start?server=" + window.localStorage.selectedServer);
}

function stopServer() {
  showModal("stop-server-modal", "fadeIn", function () {
    $.get("/server/statuses", function (sstat) {
      if (
        typeof sstat[window.localStorage.selectedServer] !== "undefined" &&
        typeof sstat[window.localStorage.selectedServer]["stopCommand"] !==
          "undefined"
      ) {
        $.get(
          "/server/sendCommand?server=" +
            window.localStorage.selectedServer +
            "&cmd=" +
            sstat[window.localStorage.selectedServer]["stopCommand"]
        );
      } else {
        $.get(
          "/server/sendCommand?server=" +
            window.localStorage.selectedServer +
            "&cmd=stop"
        );
      }
    });
  });
}

function restartServer() {
  showModal("restart-server-modal", "fadeIn", function () {
    $.get("/server/restart?server=" + window.localStorage.selectedServer);
  });
}

function killServer() {
  showModal("kill-server-modal", "fadeIn", function () {
    $.get("/server/kill?server=" + window.localStorage.selectedServer);
  });
}

function formatUptime(seconds) {
  function padU(s) {
    return (s < 10 ? "0" : "") + s;
  }
  var hours = Math.floor(seconds / (60 * 60));
  var minutes = Math.floor((seconds % (60 * 60)) / 60);
  var seconds = Math.floor(seconds % 60);

  return padU(hours) + "h" + padU(minutes) + "m" + padU(seconds) + "s";
}

const animateCSS = (element, animation, prefix = "animate__") =>
  new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);

    node.classList.add(`${prefix}animated`, animationName, `${prefix}faster`);

    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(
        `${prefix}animated`,
        animationName,
        `${prefix}faster`
      );
      resolve("Animation ended");
    }

    node.addEventListener("animationend", handleAnimationEnd, {
      once: true,
    });
  });

function convertFileSizeToHuman(size) {
  if (size < 1024) {
    size = size + " B";
  } else if (size < 1024 * 1024) {
    size = Math.round((size / 1024) * 10) / 10 + " Kb";
  } else if (size >= 1024 * 1024 && size < 1024 * 1024 * 1024) {
    size = Math.round((size / 1024 / 1024) * 10) / 10 + " Mb";
  } else if (size >= 1024 * 1024 * 1024) {
    size = Math.round((size / 1024 / 1024 / 1024) * 10) / 10 + " Gb";
  } else {
    size = size + " ?";
  }
  return size;
}

function linkify(inputText) {
  var replacedText, replacePattern1, replacePattern2, replacePattern3;

  //URLs starting with http://, https://, or ftp://
  replacePattern1 =
    /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
  replacedText = inputText.replace(
    replacePattern1,
    '<a href="$1" target="_blank">$1</a>'
  );

  //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
  replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  replacedText = replacedText.replace(
    replacePattern2,
    '$1<a href="http://$2" target="_blank">$2</a>'
  );

  //Change email addresses to mailto:: links.
  replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
  replacedText = replacedText.replace(
    replacePattern3,
    '<a href="mailto:$1">$1</a>'
  );

  return replacedText;
}
