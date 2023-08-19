var prevCommand = [];
var commandCount = 0;
var keyCount = 0;

$(document).ready(function () {
  $.get(
    "/server/log?server=" + window.localStorage.selectedServer,
    function (log) {
      refreshConsole(log);
    }
  );

  if (typeof window.localStorage.ct__fontsize !== "undefined") {
    $("#console-text").addClass(window.localStorage.ct__fontsize);
    $("#ctfontsizeRadio_" + window.localStorage.ct__fontsize).prop(
      "checked",
      true
    );
  } else {
    window.localStorage.setItem("ct__fontsize", "text-md");
    $("#console-text").addClass("text-md");
    $("#ctfontsizeRadio_text-md").prop("checked", true);
  }

  if (typeof window.localStorage.ct__fontfamily !== "undefined") {
    $("#console-text").addClass(window.localStorage.ct__fontfamily);
    $("#ctfontfamilyRadio_" + window.localStorage.ct__fontfamily).prop(
      "checked",
      true
    );
  } else {
    window.localStorage.setItem("ct__fontfamily", "default");
    $("#ctfontfamilyRadio_default").prop("checked", true);
  }

  $(".console-container input[type=radio][name=ctfontsizeRadio]").change(
    function () {
      setCTFontsize(this.value);
    }
  );

  $(".console-container input[type=radio][name=ctfontfamilyRadio]").change(
    function () {
      setCTFontFamily(this.value);
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

function setCTFontsize(fs) {
  window.localStorage.setItem("ct__fontsize", fs);
  $("#console-text").removeClass("text-sm");
  $("#console-text").removeClass("text-md");
  $("#console-text").removeClass("text-lg");
  $("#console-text").addClass(fs);
}

function setCTFontFamily(fs) {
  window.localStorage.setItem("ct__fontfamily", fs);
  $("#console-text").removeClass("mono-font");
  $("#console-text").removeClass("consolas-font");
  $("#console-text").addClass(fs);
}

function refreshConsole(data) {
  split = data.split(/\r?\n/);
  $("#console-text").html("");
  
  split.forEach(function (line) {
    html_text = linkify(mineParse(line).raw) + "<br>";
    $("#console-text").html($("#console-text").html() + html_text);
  });
  if ($("#autoscrollConsoleCheckbox").is(":checked")) {
    $("#console-text").scrollTop($("#console-text")[0].scrollHeight);
  }
}
