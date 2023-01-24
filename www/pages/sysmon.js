$(document).ready(function () {
  $.get("/kubek/hardware", function (hw) {
    for (var key in hw.enviroment) {
      value = hw.enviroment[key];
      $("#env-table tbody").append('<tr><th style="text-align:left;">' + key +
        '</th><td style="text-align:right;">' + value + '</td></tr>');
    }
    hw.disks.forEach(function (disk) {
      type = disk['_filesystem'];
      letter = disk['_mounted'];
      total = Math.round(disk['_blocks'] / 1024 / 1024 / 1024) + " GB";
      used = Math.round(disk['_used'] / 1024 / 1024 / 1024) + " GB";
      free = Math.round(disk['_available'] / 1024 / 1024 / 1024) + " GB";
      percent = disk['_capacity'];
      $("#disks-table tbody").append('<tr><td>' + letter + '</td><td>' + used +
        '</td><td>' + free + '</td><td>' + total + '</td><td>' + percent + '</td></tr>');
    });
    $("#os-name").text(hw.platform.version + " (" + hw.platform.arch + ")");
    $("#os-build").text(hw.platform.release);
    $("#totalmem").text(hw.totalmem + " Mb");
    $("#cpu-model").text(hw.cpu.model + " (" + hw.cpu.cores + " cores)");
    $("#cpu-speed").text(hw.cpu.speed + " MHz");
  });
});