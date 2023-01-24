disableIpChip = false;
oldIpChipContent = "";
$(".ip-chip").click(function () {
  if (!disableIpChip) {
    disableIpChip = true;
    oldIpChipContent = $(".ip-chip").html();
    setTimeout(function () {
      $(".ip-chip").html(oldIpChipContent);
      oldIpChipContent = "";
      disableIpChip = false;
    }, 700);
    copyIPtoClipboard();
    $(".ip-chip").html("{{copied}}");
  }
});

copyIPtoClipboard = async () => {
  try {
    ip = $("#server-ip-addr").text();
    await navigator.clipboard.writeText(ip);
    console.log("[UI]", "IP copied to clipboard");
  } catch (err) {
    console.log("[UI]", "Failed to copy IP:", err);
  }
}