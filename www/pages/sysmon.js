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
      console.log(total >= 1024 * 1024 * 1024);
      total = convertFileSizeToHuman(total);
      used = convertFileSizeToHuman(used);
      free = convertFileSizeToHuman(free); 
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

