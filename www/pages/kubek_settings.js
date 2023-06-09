var modalModeNewUser = false;
var currEdit = "";

var PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,64}$/g;
var LOGIN_REGEX = /^[a-zA-Z0-9_.-]{3,16}$/g;
var EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;

$(document).ready(function () {
  loadUsersList();
  loadKubekSettings();
  $.get("/kubek/tgOTP", function (otp) {
    $(".tgbot-otp").val(otp);
  });
  $("#tgbot-checkbox").change(function () {
    if ($(this).is(":checked")) {
      $("#tgbot-token-item").show();
      $("#tgbot-otp-item").show();
    } else {
      $("#tgbot-token-item").hide();
      $("#tgbot-otp-item").hide();
    }
  });
  $("#auth-checkbox").change(function () {
    if ($(this).is(":checked")) {
      $("#auth-users-item").show();
      showModal("needtosave-auth-warn-modal", "fadeIn");
    } else {
      $("#auth-users-item").hide();
    }
  });
  $("#ftpserver-checkbox").change(function () {
    if ($(this).is(":checked")) {
      $("#ftp-login-item").show();
      $("#ftp-pass-item").show();
    } else {
      $("#ftp-login-item").hide();
      $("#ftp-pass-item").hide();
    }
  });

  $("#blurrange-range").change(function () {
    window.localStorage.setItem("blurrange", $(this).val());
    refreshBlurRange();
  });

  $("#backgrounds-select").change(function () {
    window.localStorage.setItem(
      "background",
      $(this).find("option:selected").val()
    );
    refreshBackgroundImage();
  });
  $("#toastspos-select").change(function () {
    window.localStorage.setItem(
      "toastspos",
      $(this).find("option:selected").val()
    );
    refreshToastsPosition();
    Toaster("Test", 800, false, "success");
  });
  $("#fontfamily-select").change(function () {
    window.localStorage.setItem(
      "fontfamily",
      $(this).find("option:selected").val()
    );
    refreshFont();
  });

  $("#noupdatenotify-checkbox").change(function () {
    window.localStorage.setItem(
      "noupdatenotify",
      $(this).is(":checked").toString()
    );
  });
  $("#norounded-checkbox").change(function () {
    window.localStorage.setItem("norounded", $(this).is(":checked").toString());
    refreshNoRounded();
  });
  $("#nolowpriority-checkbox").change(function () {
    window.localStorage.setItem(
      "nolowpriority",
      $(this).is(":checked").toString()
    );
  });
  $("#nobackdrop-checkbox").change(function () {
    window.localStorage.setItem(
      "nobackdrop",
      $(this).is(":checked").toString()
    );
    refreshNoBackdrop();
  });
  $("#simplify-checkbox").change(function () {
    window.localStorage.setItem("simplify", $(this).is(":checked").toString());
    refreshSimplify();
  });
});

function loadKubekSettings() {
  $.get("/kubek/config", function (data) {
    kubekCfg = data;
    if (kubekCfg["ftpd"] == true) {
      $("#ftpserver-checkbox").attr("checked", true);
    }

    if (window.localStorage.getItem("simplify") == "true") {
      $("#simplify-checkbox").attr("checked", true);
    }

    if (window.localStorage.getItem("nobackdrop") == "true") {
      $("#nobackdrop-checkbox").attr("checked", true);
    }

    if (window.localStorage.getItem("blurrange") != null) {
      $("#blurrange-range").val(window.localStorage.getItem("blurrange"));
    }

    if (window.localStorage.getItem("norounded") == "true") {
      $("#norounded-checkbox").attr("checked", true);
    }

    if (window.localStorage.getItem("noupdatenotify") == "true") {
      $("#noupdatenotify-checkbox").attr("checked", true);
    }

    if (window.localStorage.getItem("nolowpriority") == "true") {
      $("#nolowpriority-checkbox").attr("checked", true);
    }

    $.get("/kubek/bgList", function (bgList) {
      bgList.forEach(function (bg, i) {
        iv = i + 1;
        $("#backgrounds-select").append(
          "<option value='" + bg + "'>Image " + iv + "</option>"
        );
      });
      if (window.localStorage.background != null) {
        $(
          "#backgrounds-select option[value='" +
            window.localStorage.background +
            "']"
        ).prop("selected", true);
      }
    });

    if (window.localStorage.getItem("toastspos") != null) {
      $(
        "#toastspos-select option[value='" +
          window.localStorage.getItem("toastspos") +
          "']"
      ).prop("selected", true);
    }

    if (window.localStorage.getItem("fontfamily") != null) {
      $(
        "#fontfamily-select option[value='" +
          window.localStorage.getItem("fontfamily") +
          "']"
      ).prop("selected", true);
    }

    if (kubekCfg["tgbot-enabled"] == true) {
      $("#tgbot-checkbox").attr("checked", true);
      $("#tgbot-token-item").show();
      $("#tgbot-otp-item").show();
      $(".tgbot-token").val(kubekCfg["tgbot-token"]);
    }

    if (kubekCfg["auth"] == true) {
      $("#auth-checkbox").attr("checked", true);
    }

    if (kubekCfg["save-logs"] == true) {
      $("#savelogs-checkbox").attr("checked", true);
    }

    if (kubekCfg["internet-access"] == true) {
      $("#allowintacc-checkbox").attr("checked", true);
    }

    $(".ftppass").val(kubekCfg["ftpd-password"]);
    $(".ftpuser").val(kubekCfg["ftpd-user"]);
    $(".webserverport").val(kubekCfg["webserver-port"]);
    $(".socketport").val(kubekCfg["socket-port"]);

    $.get("/kubek/support-uid", function (supuid) {
      $("#supuid").text(supuid);
    });

    if ($("#tgbot-checkbox").is(":checked")) {
      $("#tgbot-token-item").show();
      $("#tgbot-otp-item").show();
    } else {
      $("#tgbot-token-item").hide();
      $("#tgbot-otp-item").hide();
    }
    if ($("#auth-checkbox").is(":checked")) {
      $("#auth-users-item").show();
    } else {
      $("#auth-users-item").hide();
    }
    if ($("#ftpserver-checkbox").is(":checked")) {
      $("#ftp-login-item").show();
      $("#ftp-pass-item").show();
    } else {
      $("#ftp-login-item").hide();
      $("#ftp-pass-item").hide();
    }
  });

  $("#user-edit-modal .password-input").keyup(function () {
    passwd = $("#user-edit-modal .password-input").val();
    if (passwd.match(PASSWORD_REGEX) != null) {
      $("#user-edit-modal .passwd-err").hide();
    } else {
      $("#user-edit-modal .passwd-err").show();
    }
  });
}

function shutdownKubek() {
  showModal("turnoff-warn-modal", "fadeIn", function () {
    $.get("/kubek/shutdown");
  });
}

function setNewUserMode(bool) {
  if (bool) {
    $("#user-edit-modal #user-edit-modal-label").text("{{adding-usr-ks}}");
    $("#user-edit-modal .input-bg").show();
    $("#user-edit-modal .passwd-err").hide();
    $("#user-edit-modal .buttons-cont").hide();
    modalModeNewUser = true;
  } else {
    $("#user-edit-modal #user-edit-modal-label").text("{{editing-usr-ks}}");
    $("#user-edit-modal .input-bg").hide();
    $("#user-edit-modal .passwd-err").hide();
    $("#user-edit-modal .buttons-cont").show();
    modalModeNewUser = false;
  }
  setModalDefaultValues();
}

function setModalDefaultValues() {
  $("#user-edit-modal input[type=checkbox]:not(:disabled)").each(function () {
    $(this).prop("checked", false);
  });
  $(
    "#user-edit-modal input[type=text], #user-edit-modal input[type=password], #user-edit-modal input[type=email]"
  ).each(function () {
    $(this).val("");
  });
}

function openNewUserModal() {
  setNewUserMode(true);
  setModalDefaultValues();
  showModal("user-edit-modal", "fadeIn", function () {
    saveUser();
  });
}

function saveUser() {
  usrname = $("#user-edit-modal .usrname-input").val();
  mail = $("#user-edit-modal .mail-input").val();
  if (mail == "" || mail.match(EMAIL_REGEX)) {
    if (usrname.match(LOGIN_REGEX)) {
      perms = [];
      $("#user-edit-modal input[type=checkbox]:checked:not(:disabled)").each(
        function () {
          perm = $(this).data("perm");
          perms.push(perm);
        }
      );
      perms = perms.join(",");
      if (modalModeNewUser == true) {
        passwd = $("#user-edit-modal .password-input").val();
        if (passwd.match(PASSWORD_REGEX)) {
          if (mail == "") {
            reqUrl =
              "/auth/newUser?login=" +
              usrname +
              "&permissions=" +
              perms +
              "&password=" +
              passwd;
          } else {
            reqUrl =
              "/auth/newUser?login=" +
              usrname +
              "&mail=" +
              mail +
              "&permissions=" +
              perms +
              "&password=" +
              passwd;
          }
          $.get(reqUrl, function (res) {
            if (res == "Users count is limited to 5 users") {
              Toaster("{{users-limited-count-ks}}", 3000, false, "warning");
            }
            loadUsersList();
          });
        }
      } else {
        $.get(
          "/auth/editUser?login=" +
            usrname +
            "&mail=" +
            mail +
            "&permissions=" +
            perms,
          function () {
            loadUsersList();
          }
        );
      }
    }
  }
}

function setModalDataByUserInfo(userInfo) {
  setModalDefaultValues();
  currEdit = userInfo.username;
  $("#user-edit-modal .usrname-input").val(userInfo.username);
  $("#user-edit-modal .mail-input").val(userInfo.mail);
  perms = userInfo.permissions;
  $("#user-edit-modal input[type=checkbox]").each(function () {
    perm = $(this).data("perm");
    if (perms.includes(perm)) {
      $(this).prop("checked", true);
    }
  });
}

function saveKubekSettings() {
  ftpd = $("#ftpserver-checkbox").is(":checked");
  auth = $("#auth-checkbox").is(":checked");
  savelogs = $("#savelogs-checkbox").is(":checked");
  allowint = $("#allowintacc-checkbox").is(":checked");
  tgbot = $("#tgbot-checkbox").is(":checked");
  if (tgbot == false || $(".tgbot-token").val() != "") {
    if (kubekCfg["tgbot-enabled"] != tgbot && tgbot == true) {
      showModal("about-otp-modal", "fadeIn", function () {
        saveSettingsStage2();
      });
    } else {
      saveSettingsStage2();
    }
  }
}

function saveSettingsStage2() {
  if (kubekCfg["ftpd"] != ftpd) {
    showModal("ftp-need-res-modal", "fadeIn", function () {
      saveSettingsStage3();
    });
  } else {
    saveSettingsStage3();
  }
}

function saveSettingsStage3() {
  if (kubekCfg["internet-access"] != allowint) {
    showModal("othip-need-res-modal", "fadeIn", function () {
      saveSettingsStage35();
    });
  } else {
    saveSettingsStage35();
  }
}

function saveSettingsStage35() {
  if (
    kubekCfg["webserver-port"] != $(".webserverport").val() ||
    kubekCfg["socket-port"] != $(".socketport").val()
  ) {
    if (
      $(".webserverport").val() >= 80 &&
      $(".webserverport").val() <= 65500 &&
      $(".socketport").val() >= 81 &&
      $(".socketport").val() <= 65500
    ) {
      showModal("othport-need-res-modal", "fadeIn", function () {
        saveSettingsStage4();
      });
    }
  } else {
    saveSettingsStage4();
  }
}

function saveSettingsStage4() {
  kubekCfg["ftpd"] = ftpd;
  kubekCfg["auth"] = auth;
  kubekCfg["tgbot-enabled"] = tgbot;
  kubekCfg["internet-access"] = allowint;
  kubekCfg["save-logs"] = savelogs;
  kubekCfg["ftpd-password"] = $(".ftppass").val();
  kubekCfg["ftpd-user"] = $(".ftpuser").val();
  kubekCfg["tgbot-token"] = $(".tgbot-token").val();
  kubekCfg["socket-port"] = $(".socketport").val();
  kubekCfg["webserver-port"] = $(".webserverport").val();
  kubekCfg["tgbot-chatid"] = [];
  $.get(
    "/kubek/saveConfig?data=" + encodeURI(JSON.stringify(kubekCfg)),
    function (data) {
      $.get("/kubek/setFTPDStatus?value=" + ftpd, function (data) {
        location.reload();
      });
    }
  );
}

function changeAdminPass() {
  oldPass = $("#admin-edit-modal .opassword-input").val();
  newPass = $("#admin-edit-modal .npassword-input").val();
  if (oldPass != "" && newPass != "") {
    $.get(
      "/auth/changeAdminPass?oldPass=" + oldPass + "&newPass=" + newPass,
      function (ret) {
        if (ret == true) {
          window.location = "/";
        } else {
          $("#admin-edit-modal .opassword-input").val("");
          $("#admin-edit-modal .npassword-input").val("");
        }
      }
    );
  }
}

function deleteCurrUserAccount() {
  $.get("/auth/deleteUser?login=" + currEdit, function () {
    loadUsersList();
    $("#user-edit-modal").hide();
  });
}

function regenCurrUserHash() {
  $.get("/auth/regenUserHash?login=" + currEdit, function () {
    loadUsersList();
    $("#user-edit-modal").hide();
  });
}

function openEditAdminModal() {
  showModal("admin-edit-modal", "fadeIn", function () {
    changeAdminPass();
  });
}

function openEditUserModal(username) {
  setNewUserMode(false);
  $.get("/auth/getUserInfo?username=" + username, function (usrdata) {
    setModalDataByUserInfo(usrdata);
    showModal("user-edit-modal", "fadeIn", function () {
      saveUser();
    });
  });
}

function loadUsersList() {
  $("#users-list tr:not(.addusr)").each(function () {
    $(this).remove();
  });
  htmlc = "";
  $.get("/auth/listUsers", function (users) {
    htmlc =
      htmlc +
      '<tr class="bg-white dark:bg-gray-800 cursor-pointer" onclick="openEditAdminModal()"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex items-center"><i class="ri-user-2-fill text-xl"></i><span style="margin-left: 16px"></span></div></th><td class="px-6 py-4">{{admin-acc-ks}}</td></tr>';
    for (const [key, value] of Object.entries(users)) {
      usr = value;
      if (usr.mail == "undefined" || usr.mail == null || usr.mail == "") {
        usr.mail = "{{mail-no-ks}}";
      }
      if (usr.username != "kubek") {
        htmlc =
          htmlc +
          '<tr class="bg-white dark:bg-gray-800 cursor-pointer" onclick="openEditUserModal(' +
          "'" +
          usr.username +
          "'" +
          ')"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex items-center"><i class="ri-user-fill text-xl"></i><span style="margin-left: 16px"></span></div></th><td class="px-6 py-4">' +
          usr.username +
          "</td></tr>";
      }
    }
    $("#users-list").append(htmlc);
  });
}
