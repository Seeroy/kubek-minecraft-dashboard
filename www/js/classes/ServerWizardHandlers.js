// SOCKET EVENTS HANDLER CLASS

class ServerWizardHandlers {
  static handleUnpackingArchive(data) {
    if (selectedGameType == "bedrock") {
      if (data == "started") {
        if (
          ServerWizardStepper.isItemActive(BEDROCK_STEPPER_DATA[2]["id"]) ==
          false
        ) {
          ServerWizardStepper.setActiveItemByID(
            BEDROCK_STEPPER_DATA[2]["id"],
            true
          );
        }
      } else if (data == "completed") {
        ServerWizardStepper.markAsCompletedByID(BEDROCK_STEPPER_DATA[2]["id"]);
        ServerWizardStepper.setActiveItemByID(
          BEDROCK_STEPPER_DATA[3]["id"],
          true
        );
        BedrockServerCreator.completeServerCreation();
      } else {
        Toaster("Error when unpacking: " + data.toString(), -1, true, "error");
      }
    }
  }

  static handleUnpackingJavaArchive(data) {
    if (data == "started") {
      if (
        ServerWizardStepper.isItemActive(
          JAVA_STEPPER_BLOCKS["unpacking-java"]["id"]
        ) == false
      ) {
        ServerWizardStepper.setActiveItemByID(
          JAVA_STEPPER_BLOCKS["unpacking-java"]["id"],
          true
        );
      }
    } else if (data == "completed") {
      ServerWizardStepper.markAsCompletedByID(
        JAVA_STEPPER_BLOCKS["unpacking-java"]["id"]
      );
      JavaServerCreator.taskCompleted("unpacking-java");
    } else {
      Toaster("Error when unpacking: " + data.toString(), -1, true, "error");
    }
  }

  static handleDownloadTask(data) {
    Object.entries(trackingDownloads).forEach((entry) => {
      const [key, task] = entry;
      if (
        typeof data[task.filename] !== "undefined" &&
        task.completed == false
      ) {
        if (ServerWizardStepper.isItemActive(task.itemID) == false) {
          ServerWizardStepper.setActiveItemByID(task.itemID);
        }
        if (
          typeof data[task.filename] !== "undefined" &&
          data[task.filename] < 100
        ) {
          ServerWizardStepper.setItemIconByID(
            task.itemID,
            '<span class="text-green-600">' + data[task.filename] + "</span>"
          );
          ServerWizardStepper.setItemDescriptionByID(
            task.itemID,
            '<div class="w-full bg-gray-200 rounded-full h-1.5 mb-4 dark:bg-gray-700 mt-2"> <div class="bg-green-600 h-1.5 rounded-full dark:bg-green-500" style="width: ' +
              data[task.filename] +
              '%"></div></div>'
          );
        } else {
          ServerWizardStepper.markAsCompletedByID(task.itemID);
          trackingDownloads[task.filename]["completed"] = true;
          if (selectedGameType == "bedrock") {
            BedrockServerCreator.nextTask();
          } else if (selectedGameType == "java") {
            JavaServerCreator.taskCompleted(task.filename);
          }
        }
      }
    });
  }
}
