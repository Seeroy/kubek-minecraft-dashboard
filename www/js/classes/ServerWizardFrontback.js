// SERVER WIZARD MIDDLEWARE CLASS

class ServerWizardFrontback {
  static initCreation() {
    serverName = $("#server-name-input").val();
    onlineMode = $("#onlinemodeCheckbox").is(":checked");
    port = $("#serverport").val();
    javaEnabled =
      $("#java-vers option:selected").val() == "usedetect" ? true : false;
    if (coreType == "paper" || coreType == "spigot") {
      forgeEnabled = false;
    }

    if (selectedGameType == "java") {
      startLine =
        '"' +
        $("#java-vers option:selected").val() +
        '"' +
        " " +
        $("#fsc").val();
      JavaServerCreator.createServer();
    } else if (selectedGameType == "bedrock") {
      gameVersion = $("#be-game-version").val();
      BedrockServerCreator.createServer();
    }
  }

  static checkBedrockVersionExists(version, cb) {
    $.get("/server/checkBEVersion?version=" + version, function (data) {
      cb(data);
    });
  }
}