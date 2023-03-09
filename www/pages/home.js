var disableIpChip = false;
var oldIpChipContent = "";

$(document).ready(function () {
  $(".icon-changer img").attr("src", "/server/icon?server=" + window.localStorage.selectedServer);

  /*$(".ip-chip").click(function () {
    if (!disableIpChip) {
      disableIpChip = true;
      oldIpChipContent = $(".ip-chip").html();
      setTimeout(function () {
        $(".ip-chip").html(oldIpChipContent);
        oldIpChipContent = "";
        disableIpChip = false;
      }, 700);
      copyIPtoClipboard();
      $(".ip-chip").html("{{copied}}");
    }
  });*/

  $.get("/server/getServerPropertiesFile?server=" + window.localStorage.selectedServer, function (data) {
    if (typeof data['motd'] !== "undefined") {
      $("#serverNameModalEdit").val(data['motd']);
    }
  });
});

/*copyIPtoClipboard = async () => {
  try {
    ip = $("#server-ip-addr").text();
    await navigator.clipboard.writeText(ip);
    console.log("[UI]", "IP copied to clipboard");
  } catch (err) {
    console.log("[UI]", "Failed to copy IP:", err);
  }
}*/

function saveServerEdits() {
  text = $("#serverNameModalEdit").val();
  if (text.length >= 2 && text.length <= 32 && text.match(/^[a-zA-Z0-9_.-]*$/gm) !== "undefined" && text.match(/^[a-zA-Z0-9_.-]*$/gm) !=
    null) {
    $.get("/server/getServerPropertiesFile?server=" + window.localStorage.selectedServer, function (data) {
      data['motd'] = text;
      sp = "";
      keys = Object.keys(data);
      keys.forEach(function (key, i) {
        val = data[key];
        sp = sp + key + "=" + val + "\n";
      });
      sp = sp.trim();
      $.get("/server/saveServerPropertiesFile?doc=" + encodeURIComponent(sp) + "&server=" + window.localStorage.selectedServer);
      if ($("#g-img-input")[0].value != "") {
        var formData = new FormData($("#g-img-form")[0]);
        jQuery.ajax({
          url: '/upload/icon?server=' + window.localStorage.selectedServer,
          type: "POST",
          data: formData,
          success: function (data) {
            window.location = "";
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
              }
            }).showToast();
          },
          cache: false,
          contentType: false,
          processData: false,
        });
      }
    });
  }
}

function changeServerIcon() {
  $("#g-img-input").trigger('click');
  $("#g-img-input").off("change");
}