/* Functions for edit server modal */

function saveServerEdits() {
  text = $("#serverNameModalEdit").val();
  if (
    text.length >= 2 &&
    text.length <= 32 &&
    text.match(/^[a-zA-Z0-9_.-]*$/gm) !== "undefined" &&
    text.match(/^[a-zA-Z0-9_.-]*$/gm) != null
  ) {
    $.get(
      "/server/getServerPropertiesFile?server=" +
        window.localStorage.selectedServer,
      function (data) {
        data["motd"] = text;
        sp = "";
        keys = Object.keys(data);
        keys.forEach(function (key, i) {
          val = data[key];
          sp = sp + key + "=" + val + "\n";
        });
        sp = sp.trim();
        $.get(
          "/server/saveServerPropertiesFile?doc=" +
            encodeURIComponent(sp) +
            "&server=" +
            window.localStorage.selectedServer
        );
        if ($("#g-img-input")[0].value != "") {
          var formData = new FormData($("#g-img-form")[0]);
          jQuery.ajax({
            url: "/upload/icon?server=" + window.localStorage.selectedServer,
            type: "POST",
            data: formData,
            success: function (data) {
              window.location = "";
            },
            error: function (data) {
              Toaster("{{error-upload}}", 3000, false, "error");
            },
            cache: false,
            contentType: false,
            processData: false,
          });
        }
      }
    );
  }
}
