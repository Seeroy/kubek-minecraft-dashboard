$("#console-settings-button").click(function () {
  console.log("[UI]", "Displaying console settings");
  if ($(".modal-console-props").css("display") == "none") {
    $(".modal-console-props").show();
    btn = $("#console-settings-button")[0].getBoundingClientRect();
    modal = $(".modal-console-props")[0].getBoundingClientRect();
    btn_x = btn.left;
    btn_y = btn.top;

    x = btn_x - (modal.width - btn.width);
    y = btn_y + btn.height + 16;
    $(".modal-console-props").css({
      left: x,
      top: y
    })
  }
});

$("#open-logs-button").click(function () {
  url = window.location.toString();
  window.history.replaceState('', '', updateURLParameter(window.location.href, "fm_act", "logs"));
  gotoPage("file_manager");
});

$(document).ready(function () {
  $.get("/server/log?server=" + window.localStorage.selectedServer, function (log) {
    split = log.split(/\r?\n/);
    $("#console-text").html("");

    split.forEach(function (line) {
      html_text = "<span>" + line.replaceAll("<", "&lt;") + "</span><br>";
      $("#console-text").append(html_text);
    });
    if ($("#autoscrollConsoleCheckbox").is(":checked")) {
      $("#console-text").scrollTop($("#console-text")[0].scrollHeight);
    }
  });
});