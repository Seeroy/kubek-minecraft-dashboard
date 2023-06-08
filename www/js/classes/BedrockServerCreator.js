const BE_DOWNLOAD_URL = "/downloader/downloadAndUnpack";
const BE_COMPLETION_URL = "/server/bedrock/completion";

// BEDROCK SERVER CREATOR CLASS

class BedrockServerCreator {
  static createServer() {
    var stepperHTML = ServerWizardStepper.generateStepper(BEDROCK_STEPPER_DATA);
    ServerWizardUI.setProgressCardHTML(stepperHTML);
    ServerWizardStepper.setActiveItemByID(BEDROCK_STEPPER_DATA[0]["id"], true);

    ServerWizardUI.setProgressCardVisible(true);
    ServerWizardFrontback.checkBedrockVersionExists(
      gameVersion,
      function (isVersionExists) {
        if (isVersionExists.exists == true) {
          ServerWizardStepper.markAsCompletedByID(
            BEDROCK_STEPPER_DATA[0]["id"]
          );
          BedrockServerCreator.goToDownloadStep(isVersionExists.url);
        } else {
          Toaster("{{ver-notexist-sw}}", 3000, false, "error");
          ServerWizardUI.setProgressCardVisible(false);
        }
      }
    );
  }

  static goToDownloadStep(url) {
    var coreFileName = url.split("/").slice(-1).pop();
    var itemID = BEDROCK_STEPPER_DATA[1]["id"];
    ServerWizardStepper.setActiveItemByID(itemID, true);
    ServerWizardStepper.setItemTitleByID(
      itemID,
      BEDROCK_STEPPER_DATA[1]["title"] + " " + coreFileName
    );
    var dtask = {
      filename: coreFileName,
      itemID: itemID,
      completed: false,
    };
    trackingDownloads[coreFileName] = dtask;
    $.get(
      BE_DOWNLOAD_URL +
        "?server=" +
        serverName +
        "&url=" +
        encodeURIComponent(url)
    );
  }

  static completeServerCreation() {
    $.get(BE_COMPLETION_URL + "?server=" + serverName, function () {
      ServerWizardStepper.markAsCompletedByID(BEDROCK_STEPPER_DATA[3]["id"]);
      window.localStorage.setItem("selectedServer", serverName);
      setTimeout(function () {
        window.location = "/?act=console";
      }, 600);
    });
  }
}