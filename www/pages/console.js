var prevCommand = [];
var commandCount = 0;
var keyCount = 0;

$(document).ready(function () {
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
            stl = "color:" + htmlObject.firstChild.style.color + " !important;";
          } else {
            stl = "";
          }
          html_text = linkify(html_text);
          html_text =
            "<span class='text-black dark:text-white' style='" +
            stl +
            "'>" +
            html_text +
            "</span>";

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
  } else {
    window.localStorage.setItem("ct__monofont", "false");
  }

  if (typeof window.localStorage.ct__fontsize !== "undefined") {
    $("#console-text").addClass(
      window.localStorage.ct__fontsize
    );
    $("#ctfontsizeRadio_" + window.localStorage.ct__fontsize).prop(
      "checked",
      true
    );
  } else {
    window.localStorage.setItem("ct__fontsize", "text-md");
    $("#console-text").addClass(
      "text-md"
    );
    $("#ctfontsizeRadio_text-md").prop(
      "checked",
      true
    );
  }

  $("#ctmonofontCheck").change(function () {
    setCTMonofont($(this).is(":checked"));
  });

  $(".console-container input[type=radio][name=ctfontsizeRadio]").change(
    function () {
      setCTFontsize(this.value);
    }
  );

  $("#command-input").keyup(function (e) {
    input_value = $(e.target).val().trim();
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
  window.localStorage.setItem("ct__fontsize", fs);
  $("#console-text").removeClass("text-sm");
  $("#console-text").removeClass("text-md");
  $("#console-text").removeClass("text-lg");
  $("#console-text").addClass(fs);
}
