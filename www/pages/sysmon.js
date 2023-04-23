$(document).ready(function () {
  $.get("/kubek/hardware", function (hw) {
    for (var key in hw.enviroment) {
      value = hw.enviroment[key];
      $("#env-table tbody").append(
        '<tr><th style="text-align:left;">' +
          key +
          '</th><td style="text-align:right;">' +
          value +
          "</td></tr>"
      );
    }

    netkeys = Object.keys(hw.networkInterfaces);
    netkeys.forEach(function (key, i) {
      value = hw.networkInterfaces[key];
      html =
        "<tr><td style='vertical-align: middle;'>" +
        key +
        "</td><td><div class='d-flex flex-column justify-content-center'>";
      value.forEach(function (inner) {
        html =
          html + "<span>" + inner.address + " (" + inner.family + ")</span>";
      });
      html = html + "</div></td></tr>";
      $("#networks-table").append(html);
    });

    hw.disks.forEach(function (disk) {
      type = disk["_filesystem"];
      letter = disk["_mounted"];
      total = disk["_blocks"];
      used = disk["_used"];
      free = disk["_available"];

      if (hw["platform"]["name"] == "Linux") {
        total = total * 1024;
        used = used * 1024;
        free = free * 1024;
      }
      total = convertFileSizeToHuman(total);
      used = convertFileSizeToHuman(used);
      free = convertFileSizeToHuman(free);
      percent = disk["_capacity"];
      $("#disks-table tbody").append(
        "<tr><td>" +
          letter +
          "</td><td>" +
          used +
          "</td><td>" +
          free +
          "</td><td>" +
          total +
          "</td><td>" +
          percent +
          "</td></tr>"
      );
    });
    $("#os-name").text(hw.platform.version + " (" + hw.platform.arch + ")");
    $("#os-build").text(hw.platform.release);
    $("#totalmem").text(hw.totalmem + " Mb");
    $("#kubek-uptime").text(formatUptime(hw.kubekUptime));
    $("#cpu-model").text(hw.cpu.model + " (" + hw.cpu.cores + " cores)");
    $("#cpu-speed").text(hw.cpu.speed + " MHz");
  });
});
