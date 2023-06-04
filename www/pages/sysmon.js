$(document).ready(function () {
  $.get("/kubek/hardware", function (hw) {
    for (var key in hw.enviroment) {
      value = hw.enviroment[key];
      $("#env-table tbody").append(
        '<tr class="bg-white dark:bg-gray-800 glassmorphed"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
          key +
          '</th><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
          value +
          "</th></tr>"
      );
    }

    netkeys = Object.keys(hw.networkInterfaces);
    netkeys.forEach(function (key, i) {
      value = hw.networkInterfaces[key];
      html =
        '<tr class="bg-white dark:bg-gray-800 glassmorphed"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
        key +
        '</th><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div class="flex flex-col justify-center">';
      value.forEach(function (inner) {
        html =
          html + "<span>" + inner.address + " (" + inner.family + ")</span>";
      });
      html = html + "</div></th></tr>";
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
        '<tr class="bg-white dark:bg-gray-800 glassmorphed"><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
          letter +
          '</th><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
          used +
          '</th><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
          free +
          '</th><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
          total +
          '</th><th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' +
          percent +
          '</th></tr>'
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
