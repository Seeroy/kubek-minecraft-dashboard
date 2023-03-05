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
      total = disk['_blocks'];
      used = disk['_used'];
      free = disk['_available'];

      if (hw['platform']['name'] == "Linux") {
        total = total * 1024;
        used = used * 1024 ;
        free = free * 1024;
      }
      total = convToHumanReadableSize(total);
      used = convToHumanReadableSize(used);
      free = convToHumanReadableSize(free);
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

function convToHumanReadableSize(size) {
  if (size < 1024) {
    size = size + " B";
  } else if (size < 1024 * 1024) {
    size = Math.round(size / 1024 * 10) / 10 + " Kb";
  } else if (size >= 1024 * 1024) {
    size = Math.round(size / 1024 / 1024 * 10) / 10 + " Mb";
  } else if (size >= 1024 * 1024 * 1024) {
    size = Math.round(size / 1024 / 1024 / 1024 * 10) / 10 + " Gb";
  } else {
    size = size + " ?";
  }
  return size;
}