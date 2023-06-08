const JE_CORE_DL_URL = "/downloader/download";
const JE_CORE_UPLOAD_URL = "/upload/core";
const JE_FORGEINS_START_URL = "/forgeInstaller/start";
const JE_FORGEINS_PROGRESS_URL = "/forgeInstaller/progress";
const JE_JAVA_DL_URL = "/downloader/downloadJavaForServer";
const JE_JAVA_PATH_URL = "/downloader/getPathToJava";
const JE_COMPLETION_URL = "/server/completion"

const JAVA_OPTIMIZE_LINE =
  "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=15";

// JAVA SERVER CREATOR CLASS

class JavaServerCreator {
  static createServer() {
    var javaStepperData = [];
    javaStepperData.push(JAVA_STEPPER_BLOCKS["checking"]);
    if (coreType != "own") {
      javaStepperData.splice(
        javaStepperData.length,
        0,
        JAVA_STEPPER_BLOCKS["downloading-core"]
      );
    }
    if (forgeEnabled == true) {
      javaStepperData.splice(
        javaStepperData.length,
        0,
        JAVA_STEPPER_BLOCKS["installing-forge"]
      );
    }
    if (javaEnabled == true) {
      javaStepperData.splice(
        javaStepperData.length,
        0,
        JAVA_STEPPER_BLOCKS["downloading-java"]
      );
      javaStepperData.splice(
        javaStepperData.length,
        0,
        JAVA_STEPPER_BLOCKS["unpacking-java"]
      );
    }
    javaStepperData.push(JAVA_STEPPER_BLOCKS["completion"]);
    var stepperHTML = ServerWizardStepper.generateStepper(javaStepperData);
    ServerWizardUI.setProgressCardHTML(stepperHTML);
    ServerWizardStepper.setActiveItemByID(
      JAVA_STEPPER_BLOCKS["checking"]["id"],
      true
    );
    ServerWizardUI.setProgressCardVisible(true);
    if (coreType != "own") {
      JavaServerCreator.searchCore(function (coreUrl) {
        ServerWizardStepper.markAsCompletedByID(
          JAVA_STEPPER_BLOCKS["checking"]["id"],
          true
        );
        JavaServerCreator.startTasks(coreUrl);
      });
    } else {
      JavaServerCreator.proceedOwnCore();
    }
  }

  static proceedOwnCore() {
    var formData = new FormData($("#g-core-form")[0]);
    jQuery.ajax({
      url: JE_CORE_UPLOAD_URL + "?server=" + serverName,
      type: "POST",
      data: formData,
      success: function (data) {
        ServerWizardStepper.markAsCompletedByID(
          JAVA_STEPPER_BLOCKS["checking"]["id"],
          true
        );
        if (forgeEnabled == true) {
          $("#progress-card").append(
            '<textarea disabled rows=12 class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white mt-3" id="forgeins"></textarea>'
          );
          ServerWizardStepper.setActiveItemByID(
            JAVA_STEPPER_BLOCKS["installing-forge"]["id"],
            true
          );
          $.get(
            JE_FORGEINS_START_URL + "?server=" +
              encodeURI(serverName) +
              "&filename=" +
              coreFileName
          );

          var iint = setInterval(function () {
            $.get(
              JE_FORGEINS_PROGRESS_URL + "?server=" + encodeURI(serverName),
              function (get) {
                if (get != "allisok") {
                  get = get.split(/\r?\n/).slice(-100);
                  get = get.join("\n");
                  $("#forgeins").text(get);
                  $("#forgeins").scrollTop($("#forgeins")[0].scrollHeight);
                } else {
                  ServerWizardStepper.markAsCompletedByID(
                    JAVA_STEPPER_BLOCKS["installing-forge"]["id"]
                  );
                  $("#forgeins").remove();

                  if (javaEnabled == true) {
                    $.get(
                      JE_JAVA_DL_URL + "?serverVersion=" +
                        gameVersion +
                        "&server=" +
                        serverName,
                      function (javaFilename) {
                        ServerWizardStepper.setActiveItemByID(
                          JAVA_STEPPER_BLOCKS["downloading-java"]["id"],
                          true
                        );
                        var dtask = {
                          filename: javaFilename,
                          itemID: JAVA_STEPPER_BLOCKS["downloading-java"]["id"],
                          completed: false,
                        };
                        trackingDownloads[javaFilename] = dtask;
                      }
                    );
                    clearInterval(iint);
                  } else {
                    JavaServerCreator.completeServerCreation();
                  }
                }
              }
            );
          }, 500);
        } else {
          if (javaEnabled == true) {
            $.get(
              JE_JAVA_DL_URL + "?serverVersion=" +
                gameVersion +
                "&server=" +
                serverName,
              function (javaFilename) {
                ServerWizardStepper.setActiveItemByID(
                  JAVA_STEPPER_BLOCKS["downloading-java"]["id"],
                  true
                );
                var dtask = {
                  filename: javaFilename,
                  itemID: JAVA_STEPPER_BLOCKS["downloading-java"]["id"],
                  completed: false,
                };
                trackingDownloads[javaFilename] = dtask;
              }
            );
          } else {
            JavaServerCreator.completeServerCreation();
          }
        }
      },
      error: function (data) {
        Toaster("Error: " + data.statusText, 5000, false, "error");
      },
      cache: false,
      contentType: false,
      processData: false,
    });
  }

  static startTasks(url) {
    coreFileName = url.split("/").slice(-1).pop();
    ServerWizardStepper.setActiveItemByID(
      JAVA_STEPPER_BLOCKS["downloading-core"]["id"],
      true
    );
    ServerWizardStepper.setItemTitleByID(
      JAVA_STEPPER_BLOCKS["downloading-core"]["id"],
      JAVA_STEPPER_BLOCKS["downloading-core"]["title"] + " " + coreFileName
    );
    /* Creating core download task */
    var dtask = {
      filename: coreFileName,
      itemID: JAVA_STEPPER_BLOCKS["downloading-core"]["id"],
      completed: false,
    };
    trackingDownloads[coreFileName] = dtask;
    $.get(
      JE_CORE_DL_URL +
        "?server=" +
        serverName +
        "&url=" +
        encodeURIComponent(url) +
        "&filename=" +
        coreFileName +
        "&type=core"
    );
    /* Creating Java download task (if needed) */
    if (javaEnabled == true) {
      $.get(
        JE_JAVA_DL_URL + "?serverVersion=" +
          gameVersion +
          "&server=" +
          serverName,
        function (javaFilename) {
          ServerWizardStepper.setActiveItemByID(
            JAVA_STEPPER_BLOCKS["downloading-java"]["id"],
            true
          );
          var dtask = {
            filename: javaFilename,
            itemID: JAVA_STEPPER_BLOCKS["downloading-java"]["id"],
            completed: false,
          };
          trackingDownloads[javaFilename] = dtask;
        }
      );
    }
  }

  static searchCore(cb) {
    $.get(
      "/cores/" +
        coreType +
        "/search?core=" +
        coreType.charAt(0).toUpperCase() +
        coreType.slice(1) +
        " " +
        gameVersion,
      function (data) {
        if (data != "") {
          cb(data);
        }
      }
    );
  }

  static taskCompleted(filename) {
    if (javaEnabled == true) {
      if (filename == "unpacking-java") {
        $.get(
          JE_JAVA_PATH_URL + "?server=" + serverName,
          function (path) {
            startLine = '"' + path + '"' + " " + $("#fsc").val();
            JavaServerCreator.completeServerCreation();
          }
        );
      }
    } else {
      JavaServerCreator.completeServerCreation();
    }
  }

  static completeServerCreation() {
    ServerWizardStepper.setActiveItemByID(
      JAVA_STEPPER_BLOCKS["completion"]["id"],
      true
    );
    $.get(
      JE_COMPLETION_URL + "?server=" +
        encodeURI(serverName) +
        "&jf=" +
        coreFileName +
        "&startcmd=" +
        btoa(startLine) +
        "&port=" +
        port +
        "&onMode=" +
        onlineMode,
      function (data) {
        if (data == "Success") {
          ServerWizardStepper.markAsCompletedByID(
            BEDROCK_STEPPER_DATA[3]["id"]
          );
          window.localStorage.setItem("selectedServer", serverName);
          setTimeout(function () {
            window.location = "/?act=console";
          }, 600);
        }
      }
    );
  }
}