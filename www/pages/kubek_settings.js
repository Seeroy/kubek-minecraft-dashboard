var modalModeNewUser = false;
var currEdit = "";
mymodal = new mdb.Modal(document.getElementById('userEditModal'));
admmodal = new mdb.Modal(document.getElementById('adminEditModal'));

var PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,64}$/g;
var LOGIN_REGEX = /^[a-zA-Z0-9_.-]{3,16}$/g;
var EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;

$(document).ready(function () {
  loadUsersList();
  loadKubekSettings();
  new mdb.Tooltip(document.getElementById('tooltip-acc'));
  $("#tgbot-checkbox").change(function () {
    if ($(this).is(":checked")) {
      $("#tgbot-token-item").show();
    } else {
      $("#tgbot-token-item").hide();
    }
  });
  $(".addtooltip").each(function () {
    new mdb.Tooltip(this);
  });
});

function loadKubekSettings() {
  $.get("/kubek/config", function (data) {
    kubekCfg = data;
    if (kubekCfg['lang'] == "en") {
      $("#englishRadio").attr("checked", true);
    } else if (kubekCfg['lang'] == "ru") {
      $("#russianRadio").attr("checked", true);
    } else if (kubekCfg['lang'] == "nl") {
      $("#dutchRadio").attr("checked", true);
    }

    if (kubekCfg['ftpd'] == true) {
      $("#ftpserver-checkbox").attr("checked", true);
    }

    if (kubekCfg['tgbot-enabled'] == true) {
      $("#tgbot-checkbox").attr("checked", true);
      $("#tgbot-token-item").show();
      $(".tgbot-token").val(kubekCfg['tgbot-token']);
    }

    if (kubekCfg['auth'] == true) {
      $("#auth-checkbox").attr("checked", true);
    }

    if (kubekCfg['save-logs'] == true) {
      $("#savelogs-checkbox").attr("checked", true);
    }

    if (kubekCfg['internet-access'] == true) {
      $("#allowintacc-checkbox").attr("checked", true);
    }

    $(".ftppass").val(kubekCfg["ftpd-password"]);
    $(".ftpuser").val(kubekCfg["ftpd-user"]);

    $.get("/kubek/support-uid", function (supuid) {
      $("#supuid").text(supuid);
    });
  });

  $("#userEditModal .password-input").keyup(function () {
    passwd = $("#userEditModal .password-input").val();
    if (passwd.match(PASSWORD_REGEX) != null) {
      $("#userEditModal .passwd-err").hide();
    } else {
      $("#userEditModal .passwd-err").show();
    }
  });

  $("#adminEditModal .npassword-input").keyup(function () {
    passwd = $("#adminEditModal .npassword-input").val();
    if (passwd.match(PASSWORD_REGEX) != null) {
      $("#adminEditModal .passwd-err").hide();
    } else {
      $("#adminEditModal .passwd-err").show();
    }
  });

  $("#userEditModal .input-bg .material-symbols-outlined.showpass").click(function () {
    if ($(this).parent().parent().hasClass("showing-pass")) {
      $(this).parent().parent().removeClass("showing-pass");
      $(this).parent().parent().children(".password-input").attr("type", "password");
    } else {
      $(this).parent().parent().addClass("showing-pass");
      $(this).parent().parent().children(".password-input").attr("type", "text");
    }
  });

  $(".element .input-bg .material-symbols-outlined.showpass").click(function () {
    if ($(this).parent().parent().hasClass("showing-pass")) {
      $(this).parent().parent().removeClass("showing-pass");
      $(this).parent().parent().children(".kbk-input").attr("type", "password");
    } else {
      $(this).parent().parent().addClass("showing-pass");
      $(this).parent().parent().children(".kbk-input").attr("type", "text");
    }
  });

  $("#userEditModal .input-bg .material-symbols-outlined.genpass").click(function () {
    genp = generatePassword(24);
    $(this).parent().parent().children(".password-input").val(genp);
    $(this).parent().parent().children(".password-input").keyup();
  });

  $("#adminEditModal .input-bg .material-symbols-outlined.genpass").click(function () {
    genp = generatePassword(24);
    $(this).parent().parent().children(".npassword-input").val(genp);
    $(this).parent().parent().children(".npassword-input").keyup();
  });

  $("#adminEditModal .input-bg .material-symbols-outlined.showpass").click(function () {
    if ($(this).parent().parent().hasClass("showing-pass")) {
      $(this).parent().parent().removeClass("showing-pass");
      $(this).parent().parent().children(".npassword-input").attr("type", "password");
    } else {
      $(this).parent().parent().addClass("showing-pass");
      $(this).parent().parent().children(".npassword-input").attr("type", "text");
    }
  });
}

function generatePassword(length) {
  var pass = '';
  var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'abcdefghijklmnopqrstuvwxyz0123456789@#$';

  for (let i = 1; i <= length; i++) {
    var char = Math.floor(Math.random() *
      str.length + 1);

    pass += str.charAt(char)
  }

  return pass;
}

function shutdownKubek() {
  $.get("/kubek/shutdown");
}

function setNewUserMode(bool) {
  if (bool) {
    $("#userEditModal #userEditModalLabel").text("{{adding-usr-ks}}");
    $("#userEditModal .input-bg").show();
    $("#userEditModal .passwd-err").hide();
    $("#userEditModal .usrname-group").show();
    $("#userEditModal .buttons-cont").hide();
    modalModeNewUser = true;
  } else {
    $("#userEditModal #userEditModalLabel").text("{{editing-usr-ks}}");
    $("#userEditModal .input-bg").hide();
    $("#userEditModal .passwd-err").hide();
    $("#userEditModal .usrname-group").hide();
    $("#userEditModal .buttons-cont").show();
    modalModeNewUser = false;
  }
  setModalDefaultValues();
}

function setModalDefaultValues() {
  $("#userEditModal input[type=checkbox]:not(:disabled)").each(function () {
    $(this).prop("checked", false);
  });
  $("#userEditModal input[type=text], #userEditModal input[type=password], #userEditModal input[type=email]").each(function () {
    $(this).val("");
  });
}

function openNewUserModal() {
  setNewUserMode(true);
  setModalDefaultValues();
  mymodal.show();
}

function saveUser() {
  usrname = $("#userEditModal .usrname-input").val();
  mail = $("#userEditModal .mail-input").val();
  if (mail == "" || mail.match(EMAIL_REGEX)) {
    if (usrname.match(LOGIN_REGEX)) {
      perms = [];
      $("#userEditModal input[type=checkbox]:checked:not(:disabled)").each(function () {
        perm = $(this).data("perm");
        perms.push(perm);
      });
      perms = perms.join(",");
      if (modalModeNewUser == true) {
        passwd = $("#userEditModal .password-input").val();
        if (passwd.match(PASSWORD_REGEX)) {
          if (mail == "") {
            reqUrl = "/auth/newUser?login=" + usrname + "&permissions=" + perms + "&password=" + passwd;
          } else {
            reqUrl = "/auth/newUser?login=" + usrname + "&mail=" + mail + "&permissions=" + perms + "&password=" + passwd;
          }
          $.get(reqUrl, function (res) {
            if (res == "Users count is limited to 5 users") {
              Toastify({
                text: "{{users-limited-count-ks}}",
                duration: 3000,
                newWindow: true,
                close: false,
                gravity: "bottom",
                position: "left",
                stopOnFocus: true,
                style: {
                  background: "#dc4c64",
                  color: "white",
                },
                onClick: function () {}
              }).showToast();
            }
            mymodal.hide();
            loadUsersList();
          });
        }
      } else {
        $.get("/auth/editUser?login=" + usrname + "&mail=" + mail + "&permissions=" + perms, function () {
          mymodal.hide();
          loadUsersList();
        });
      }
    }
  }
}

function setModalDataByUserInfo(userInfo) {
  setModalDefaultValues();
  currEdit = userInfo.username;
  $("#userEditModal .usrname-input").val(userInfo.username);
  $("#userEditModal .mail-input").val(userInfo.mail);
  perms = userInfo.permissions;
  $("#userEditModal input[type=checkbox]").each(function () {
    perm = $(this).data("perm");
    if (perms.includes(perm)) {
      $(this).prop("checked", true);
    }
  });
}

function saveKubekSettings() {
  rl_page = false;
  ftpd = $("#ftpserver-checkbox").is(":checked");
  auth = $("#auth-checkbox").is(":checked");
  savelogs = $("#savelogs-checkbox").is(":checked");
  allowint = $("#allowintacc-checkbox").is(":checked");
  tgbot = $("#tgbot-checkbox").is(":checked");

  if (kubekCfg['auth'] != auth) {
    rl_page = true;
  }
  if (tgbot == true) {
    alert("Для начала работы бота напишите ему /start, только тогда он будет работать");
  }
  if (kubekCfg['ftpd'] != ftpd && ftpd == false) {
    alert("Для отключения FTPD требуется полный перезапуск Kubek");
  }
  kubekCfg["ftpd"] = ftpd;
  kubekCfg["auth"] = auth;
  kubekCfg["tgbot-enabled"] = tgbot;
  kubekCfg["internet-access"] = allowint;
  kubekCfg["save-logs"] = savelogs;
  kubekCfg["ftpd-password"] = $(".ftppass").val();
  kubekCfg["ftpd-user"] = $(".ftpuser").val();
  kubekCfg["tgbot-token"] = $(".tgbot-token").val();
  kubekCfg['tgbot-chatid'] = [];
  $.get("/kubek/saveConfig?data=" + encodeURI(JSON.stringify(kubekCfg)), function (data) {
    $.get("/kubek/setFTPDStatus?value=" + ftpd, function (data) {
      if (rl_page == false) {
        loadKubekSettings();
        Toastify({
          text: "{{settings-saved}}",
          duration: 3000,
          newWindow: true,
          close: false,
          gravity: "bottom",
          position: "left",
          stopOnFocus: true,
          style: {
            background: "#0067f4",
            color: "white",
          },
          onClick: function () {}
        }).showToast();
      } else {
        location.reload();
      }
    });
  });
}

function changeAdminPass() {
  oldPass = $("#adminEditModal .opassword-input").val();
  newPass = $("#adminEditModal .npassword-input").val();
  $.get("/auth/changeAdminPass?oldPass=" + oldPass + "&newPass=" + newPass, function (ret) {
    if (ret == true) {
      admmodal.hide();
      window.location = "/";
    } else {
      $("#adminEditModal .opassword-input").val("");
      $("#adminEditModal .npassword-input").val("");
    }
  });
}

function deleteCurrUserAccount() {
  $.get("/auth/deleteUser?login=" + currEdit, function () {
    mymodal.hide();
    loadUsersList();
  });
}

function regenCurrUserHash() {
  $.get("/auth/regenUserHash?login=" + currEdit, function () {
    mymodal.hide();
    loadUsersList();
  });
}

function openEditAdminModal() {
  admmodal.show();
}

function openEditUserModal(username) {
  setNewUserMode(false);
  $.get("/auth/getUserInfo?username=" + username, function (usrdata) {
    setModalDataByUserInfo(usrdata);
    mymodal.show();
  });
}

function loadUsersList() {
  $("#users-list .col-xl-4.ucard").each(function () {
    $(this).remove();
  });
  $.get("/auth/listUsers", function (users) {
    $("#users-list").append('<div class="col-xl-4 col-lg-6 ucard"><div class="card" onclick="openEditAdminModal()"><div class="card-body"><div class="d-flex align-items-center"><span class="material-symbols-outlined">admin_panel_settings</span><div class="ms-3"><p class="fw-bold mb-1">kubek</p><p class="text-muted mb-0">{{admin-acc-ks}}</p></div></div></div></div></div>');
    for (const [key, value] of Object.entries(users)) {
      usr = value;
      if (usr.mail == "undefined" || usr.mail == null || usr.mail == "") {
        usr.mail = "{{mail-no-ks}}";
      }
      if (usr.username != "kubek") {
        $("#users-list").append('<div class="col-xl-4 col-lg-6 ucard"><div class="card" onclick="openEditUserModal(' + "'" + usr.username + "'" +
          ')"><div class="card-body"><div class="d-flex align-items-center"><span class="material-symbols-outlined">account_circle</span><div class="ms-3"><p class="fw-bold mb-1">' + usr.username + '</p><p class="text-muted mb-0">' + usr.mail + '</p></div></div></div></div></div>');
      }
    }
  });
}