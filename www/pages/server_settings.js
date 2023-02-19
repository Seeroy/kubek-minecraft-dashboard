startScript_save = "";

$(document).ready(function () {
  cs = false;
  refreshServerProperties();
  $("#main-pills .icon-changer img").attr("src", "/server/icon?server=" + window.localStorage.selectedServer);
  $.get("/server/getStartScript?server=" + window.localStorage.selectedServer, function (data) {
    javaPath = data.toString().substring(1, data.length);
    javaPath = javaPath.substring(0, javaPath.search('"'));
    startScript_save = data.toString().substring(1, data.length).replace(javaPath, "").trim();
    $.get("/kubek/javaVersions", function (jv) {
      jv.forEach(function (jfile, i) {
        active = "";
        if (jfile == javaPath) {
          active = " checked";
        }
        $("#java-versions-radios").append('<div class="form-check"><input class="form-check-input" type="radio"' + active + ' name="javaRadios" id="javaRadio-' + i + '" /><label class="form-check-label" for="javaRadio-' + i + '"> ' + jfile + ' </label></div>');
      });
    });
  });

  $("#delete-sname").val("");
  $("#delete-button").click(function () {
    if ($("#delete-sname").val() == window.localStorage.selectedServer) {
      deleteServer();
    }
  });
  $("#delete-sname").keyup(function () {
    if ($(this).val() == window.localStorage.selectedServer) {
      $("#delete-button").removeAttr("disabled");
    } else {
      $("#delete-button").attr("disabled", true);
    }
  });
});

function deleteServer() {
  Swal.fire({
    title: "<span style='font-weight: 600; font-size: 16pt;'>{{removing}} " + window.localStorage.selectedServer +
      "...</span><br><span style='font-weight: 400; font-size: 15pt;'>{{do-not-reload-page}}!</span>",
    html: '<div style="display: flex; justify-content: center;"><div style="width: 48px; height: 48px; border-radius: 50%; background: #0067f4;" class="animate__animated animate__fadeIn animate__infinite"></div></div>',
    showCancelButton: false,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
  })
  $.get("/server/delete?server=" + window.localStorage.selectedServer, function () {
    window.localStorage.removeItem("selectedServer");
    window.location = "/";
  });
}

function changeServerIcon() {
  $("#g-img-input").trigger('click');
  $("#g-img-input").off("change");
  $("#g-img-input").change(function () {
    var formData = new FormData($("#g-img-form")[0]);
    jQuery.ajax({
      url: '/upload/icon?server=' + window.localStorage.selectedServer,
      type: "POST",
      data: formData,
      success: function (data) {
        Swal.fire(
          '{{success}}',
          '{{restart-server-to-see-changes}}',
          'success'
        ).then((result) => {
          window.location = "";
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

function saveServerSettings() {
  script = '"' + $("#java-versions-radios input:checked").next().text().trim().replace('"', "") + startScript_save;
  $.get("/server/saveStartScript?server=" + window.localStorage.selectedServer + "&script=" + btoa(script) + "&resonerr=" + $(
    "#resOnErrCheckbox").is(":checked"));
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
}

function refreshServerProperties() {
  $.get("/server/getServerPropertiesFile?server=" + window.localStorage.selectedServer, function (data) {
    keys = Object.keys(data);
    fulls = data;
    keys.forEach(function (key, i) {
      znach = fulls[key];
      if(typeof znach == "object"){
        znach = JSON.stringify(znach).replace("null", "").trim();;
      }
      if (typeof znach == "boolean") {
        if (znach == true) {
          checkd = " checked";
        } else {
          checkd = "";
        }
        $("#speditor-pills .container_sp").append(
          '<div class="ttc"><div class="form-check form-switch cbox"><input type="checkbox" role="switch" id="ct' +
          i + '" name="ct' + i + '" class="form-check-input"' + checkd +
          '><label class="stlabel form-check-label" for="ct' + i + '">' + key +
          '</label></div>');
      } else {
        if (znach != null) {
          $("#speditor-pills .container_sp").append(
            '<div class="ttc ttbb"><div class="ttcc"><input type="text" style="width: 256px" class="form-control" value="' +
            znach + '"></div><div class="ttcc"><span>' + key + '</span></div></div>');
        } else {
          $("#speditor-pills .container_sp").append(
            '<div class="ttc ttbb"><div class="ttcc"><input type="text" style="width: 256px" class="form-control" value=""></div><div class="ttcc"><span>' +
            key + '</span></div></div>');
        }
      }
    });
  });
}

function saveProps() {
  var sp = "";
  $(".ttgrid .cbox").each(function () {
    chk = $(this).find("input").is(':checked') ? true : false;
    key = $(this).find("label").html();
    if (sp !== "") {
      sp = sp + "\n" + key + "=" + chk;
    } else {
      sp = key + "=" + chk;
    }
  });
  $(".ttbb").each(function () {
    value = $(this).find("input").val();
    key = $(this).find("span").html();
    sp = sp + "\n" + key + "=" + value;
  });
  sp = sp.trim();
  $.get("/server/saveServerPropertiesFile?doc=" + encodeURIComponent(sp) + "&server=" + window.localStorage.selectedServer);
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
}