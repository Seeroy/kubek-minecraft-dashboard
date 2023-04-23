var prevCommand = [];
var commandCount = 0;
var keyCount = 0;

//var tabulationCommands = ["msg", "bc", "broadcast"];

$(document).ready(function () {
  $(".icon-changer img").attr(
    "src",
    "/server/icon?server=" + window.localStorage.selectedServer
  );

  $.get(
    "/server/getServerPropertiesFile?server=" +
      window.localStorage.selectedServer,
    function (data) {
      if (typeof data["motd"] !== "undefined") {
        $("#serverNameModalEdit").val(data["motd"]);
      }
    }
  );

  $.get(
    "/server/log?server=" + window.localStorage.selectedServer,
    function (log) {
      split = log.split(/\r?\n/);
      $("#console-text").html("");

      split.forEach(function (line) {
        line = mineParse(line.replaceAll("<", "&lt;")).parsed.innerHTML;

        htmlObject = document.createElement("div");
        htmlObject.innerHTML = line;
        if (htmlObject.firstChild.firstChild != null) {
          html_text =
            htmlObject.firstChild.firstChild.wholeText.replaceAll("<", "&lt;") +
            "<br>";
          if (htmlObject.firstChild.style.color != "") {
            stl = "color:" + htmlObject.firstChild.style.color + ";";
          } else {
            stl = "";
          }
          html_text = linkify(html_text);
          html_text = "<span style='" + stl + "'>" + html_text + "</span>";

          $("#console-text").html($("#console-text").html() + html_text);
        }
      });
      if ($("#autoscrollConsoleCheckbox").is(":checked")) {
        $("#console-text").scrollTop($("#console-text")[0].scrollHeight);
      }
    }
  );

  if (typeof window.localStorage.ct__monofont !== "undefined") {
    if (window.localStorage.ct__monofont == "true") {
      $("#console-text").addClass("mono-console-text");
      $("#ctmonofontCheck").prop("checked", true);
    }
  }

  if (typeof window.localStorage.ct__fontsize !== "undefined") {
    $("#console-text").addClass(
      window.localStorage.ct__fontsize + "-console-text"
    );
    $("#ctfontsizeRadio_" + window.localStorage.ct__fontsize).prop(
      "checked",
      true
    );
  }

  if (
    typeof window.localStorage.ct__cpuchart !== "undefined" &&
    window.localStorage.ct__cpuchart == "true"
  ) {
    $("#ctcpuchartCheck").prop("checked", true);
  }

  $("#console-settings-button").click(function () {
    console.log("[UI]", "Displaying console settings");
    if ($(".modal-console-props").css("display") == "none") {
      $(".modal-console-props").show();
      btn = $("#console-settings-button")[0].getBoundingClientRect();
      modal = $(".modal-console-props")[0].getBoundingClientRect();
      btn_x = btn.left;
      btn_y = btn.top;

      x = btn_x - modal.width;
      y = btn_y - modal.height - 16;
      $(".modal-console-props").css({
        left: x,
        top: y,
      });
    }
  });

  $("#ctmonofontCheck").change(function () {
    setCTMonofont($(this).is(":checked"));
  });

  $("#ctcpuchartCheck").change(function () {
    setCTBuildChart($(this).is(":checked"));
  });

  $(".modal-console-props input[type=radio][name=ctfontsizeRadio]").change(
    function () {
      setCTFontsize(this.value);
    }
  );

  $("#command-input").keyup(function (e) {
    input_value = $(e.target).val().trim();
    /*if (input_value.length > 0) {
      var tabbed = [];
      tabulationCommands.forEach(function (command) {
        regexp_search = new RegExp(input_value, "i");
        if (regexp_search.test(command)) {
          tabbed.push(command);
        }
      });
      console.log(tabbed);
    }*/
    if (e.key == "Enter") {
      $.get(
        "/server/sendCommand?server=" +
          window.localStorage.selectedServer +
          "&cmd=" +
          input_value
      );
      commandCount++;
      keyCount = 0;
      prevCommand[commandCount] = input_value;
      $(e.target).val("");
    }
    if (e.which == 38 && $(e.target).is(":focus")) {
      keyCount++;
      var index = prevCommand.length - keyCount;
      if (typeof prevCommand[index] !== "undefined") {
        $("#command-input").val(prevCommand[index]);
      }
    }
    if (e.which == 40 && $(e.target).is(":focus")) {
      keyCount--;
      var index = prevCommand.length - keyCount;
      if (typeof prevCommand[index] !== "undefined") {
        $("#command-input").val(prevCommand[index]);
      } else {
        $("#command-input").val("");
      }
    }
  });
});

function setCTMonofont(mf) {
  if (typeof mf == "boolean") {
    window.localStorage.setItem("ct__monofont", mf);
    if (mf == true) {
      $("#console-text").addClass("mono-console-text");
    } else {
      $("#console-text").removeClass("mono-console-text");
    }
  }
}

function setCTFontsize(fs) {
  if (fs == "small" || fs == "medium" || fs == "large") {
    window.localStorage.setItem("ct__fontsize", fs);
    $("#console-text").removeClass("small-console-text");
    $("#console-text").removeClass("medium-console-text");
    $("#console-text").removeClass("large-console-text");
    $("#console-text").addClass(fs + "-console-text");
  }
}

function setCTBuildChart(mode) {
  if (mode == false) {
    if (typeof cpu_chart !== "undefined") {
      cpu_chart.destroy();
      cpu_chart = undefined;
    }
    cpu_saves = [];
  }
  window.localStorage.setItem("ct__cpuchart", mode);
}

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
                },
              }).showToast();
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

function changeServerIcon() {
  $("#g-img-input").trigger("click");
  $("#g-img-input").off("change");
}
