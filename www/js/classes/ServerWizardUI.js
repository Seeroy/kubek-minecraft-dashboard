const GET_CORES_URL = "/cores/list";

// UI CONTROLS CLASS

class ServerWizardUI {
  static setDefaultValues() {
    $("#new-server-wizard-drawer select").each(function () {
      $(this).prop("selectedIndex", 0);
    });
    $("#new-server-wizard-drawer #core-versions").addClass("hidden");
    $("#new-server-wizard-drawer #g-core-input").val("");
    $("#new-server-wizard-drawer #g-core-input")[0].value = "";
    $("#new-server-wizard-drawer .java-edition-only").show();
    $("#new-server-wizard-drawer .bedrock-edition-only").hide();

    $("#new-server-wizard-drawer input[type=text]").each(function () {
      $(this).val("");
    });
    $("#new-server-wizard-drawer input[type=text]").each(function () {
      $(this).val("");
    });

    $("#serverport").val(25565);

    $.get("/kubek/usage", function (usage) {
      var total = round512(Math.round(usage.totalmem / 1024 / 1024));
      var ttl = (total / 1024).toFixed(1) / 2;
      var max = (total / 1024).toFixed(1);
      $("#xmx").val(ttl);
      $("#xmx").attr("max", max);
      ServerWizardUI.generateJavaStartup();
    });

    $.get("/kubek/javaVersions", function (jv) {
      $("#java-vers").append(
        '<option value="usedetect">{{use-compat-java-auto-sw}}</option>'
      );
      jv.forEach(function (jfile) {
        $("#java-vers").append(
          '<option value="' + jfile + '">' + jfile + "</option>"
        );
      });

      if ($("#java-vers").length > 1) {
        $("#java-vers option").eq(1).prop("selected", true);
      } else {
        $("#java-vers option").eq(0).prop("selected", true);
      }
      ServerWizardUI.generateJavaStartup();
    });

    return true;
  }

  static setProgressCardText(text) {
    $("#progress-card p").html(text);
    return true;
  }

  static validateBEVersion(version) {
    var split = version.split(".");
    split.forEach(function (v, i) {
      var v = parseInt(v);
      if (v != NaN) {
        split[i] = v;
      } else {
        split[i] = -1;
      }
    });
    if (split[0] == 1 || split[0] == 0) {
      if (split[1] > -1 && split[2] > -1 && split[3] > -1) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  static setCreateButtonEnabled(isEnabled) {
    if (isEnabled == true) {
      $("#new-server-wizard-drawer button.create-btn").removeClass("hidden");
      $("#new-server-wizard-drawer button.disabled-btn").addClass("hidden");
    } else {
      $("#new-server-wizard-drawer button.create-btn").addClass("hidden");
      $("#new-server-wizard-drawer button.disabled-btn").removeClass("hidden");
    }
  }

  static getCoresList(cb) {
    $.get(GET_CORES_URL, function (response) {
      cb(response);
    });
  }

  static setupBinds() {
    $(
      "#new-server-wizard-drawer input:not(#xmx), #new-server-wizard-drawer textarea"
    ).on("keydown keyup input", function () {
      ServerWizardUI.validateInputs();
    });

    $("#new-server-wizard-drawer #be-game-version").on(
      "keydown keyup input",
      function () {
        var validate_result = ServerWizardUI.validateBEVersion($(this).val());
        setInputInvalidMode(
          $("#new-server-wizard-drawer #be-game-version"),
          invertBoolean(validate_result)
        );
      }
    );

    $("#game-type").change(function () {
      selectedGameType = $("#game-type option:selected").val();
      if (selectedGameType == "java") {
        $("#new-server-wizard-drawer .java-edition-only").show();
        $("#new-server-wizard-drawer .bedrock-edition-only").hide();
      } else if (selectedGameType == "bedrock") {
        $("#new-server-wizard-drawer .java-edition-only").hide();
        $("#new-server-wizard-drawer .bedrock-edition-only").show();
      }
    });

    $("#core-brands").change(function () {
      ServerWizardUI.validateInputs();
      coreType = $("#core-brands option:selected").val();
      if (coreType != "own") {
        $("#core-versions").removeClass("hidden");
        $("#g-core-input").addClass("hidden");
        ServerWizardUI.loadCores(coreType);
      } else {
        $("#core-versions").addClass("hidden");
        $("#g-core-input").removeClass("hidden");
      }
    });

    $("#core-versions").change(function () {
      ServerWizardUI.validateInputs();
      gameVersion = $("#core-versions option:selected").val();
      $.get("/kubek/verToJava?version=" + gameVersion, function (jv) {
        $("#new-server-wizard-drawer .req-java").text(
          "{{recomm-java-msg-sw}} " + jv
        );
      });
    });

    $("#g-core-input").change(function () {
      coreFileName = $("#g-core-input")[0]
        .value.split(/(\\|\/)/g)
        .pop();
      var det = detectServerVersion(coreFileName);
      if (det != null) {
        gameVersion = det[0].replace("-", "").trim();
        $("#srv-ver-detected").html(
          "<span style='color: gray;'>{{lookslike-ver-sw}}</span>" + gameVersion
        );
        $("#srv-ver-detected").data("ver", gameVersion);
        $("#srv-ver-detected").show();
      } else {
        gameVersion = null;
      }

      $.get("/kubek/verToJava?version=" + gameVersion, function (jv) {
        $("#new-server-wizard-drawer .req-java").text(
          "{{recomm-java-msg-sw}} " + jv
        );
        ServerWizardUI.validateInputs();
      });
      forgeEnabled =
        coreFileName.match(/forge.*-installer/gim) != null ? true : false;
    });

    $("#xmx").change(function () {
      if ($(this).val() > parseInt($(this).attr("max"))) {
        $(this).val(parseInt($(this).attr("max")));
      }
      if ($(this).val() < $(this).attr("min")) {
        $(this).val($(this).attr("min"));
      }
      ServerWizardUI.validateInputs();
      ServerWizardUI.generateJavaStartup();
    });
  }

  static generateJavaStartup() {
    var sl = "";
    sl += "-Dfile.encoding=UTF-8 ";
    sl += "-Xmx" + Math.round($("#xmx").val() * 1024) + "M";
    sl += " ";
    if ($("#javaOptiflagsCheckbox").is(":checked")) {
      sl += JAVA_OPTIMIZE_LINE;
      sl += " ";
    }
    sl += "-jar";
    $("#fsc").val(sl);
  }

  static loadCores(coreType) {
    $("#core-versions").html("");
    console.log("[UI]", "Loading cores versions for " + coreType);
    ServerWizardUI.getCoresList(function (cores) {
      var crl = cores[coreType];
      crl.forEach((ver) => {
        $("#core-versions").append(
          "<option value='" + ver + "'>" + ver + "</option>"
        );
      });
      gameVersion = crl[0];
      console.log("[UI]", "Successfully loaded cores list");
    });
  }

  static validateInputs() {
    var check_1 = false;
    var check_1_items = 0;
    var check_2 = false;
    var check_3 = false;
    var check_4 = false;
    var all_checks = false;
    var text = "";

    $(
      "#new-server-wizard-drawer ." +
        selectedGameType +
        "-edition-only input[type=text], #new-server-wizard-drawer ." +
        selectedGameType +
        "-edition-only input[type=number]"
    ).each(function () {
      if ($(this).val() != "") {
        check_1_items++;
        setInputInvalidMode($(this), false);
      } else {
        setInputInvalidMode($(this), true);
      }
    });
    if (
      check_1_items ==
      $(
        "#new-server-wizard-drawer ." +
          selectedGameType +
          "-edition-only input[type=text], #new-server-wizard-drawer ." +
          selectedGameType +
          "-edition-only input[type=number]"
      ).length
    ) {
      check_1 = true;
    }

    if ($("#new-server-wizard-drawer #core-brands").css("display") != "none") {
      if (
        $("#new-server-wizard-drawer #core-brands option:selected").val() ==
        "own"
      ) {
        if ($("#new-server-wizard-drawer #g-core-input")[0].value != "") {
          check_2 = true;
        }
      } else if (
        $("#new-server-wizard-drawer #core-brands option:selected").text() !=
        "Выберите ядро"
      ) {
        check_2 = true;
      }
    } else {
      check_2 = true;
    }

    if ($("#new-server-wizard-drawer #fsc").css("display") != "none") {
      if ($("#new-server-wizard-drawer #fsc").val() != "") {
        check_3 = true;
      }
      setInputInvalidMode(
        $("#new-server-wizard-drawer #fsc"),
        invertBoolean(check_3)
      );
    } else {
      check_3 = true;
    }

    text = $("#server-name-input").val();
    if (
      text.length >= 2 &&
      text.length <= 32 &&
      text.match(snameRegex) !== "undefined" &&
      text.match(snameRegex) != null
    ) {
      check_4 = true;
    }
    setInputInvalidMode($("#server-name-input"), invertBoolean(check_4));

    if (
      check_1 == true &&
      check_2 == true &&
      check_3 == true &&
      check_4 == true
    ) {
      all_checks = true;
    }
    ServerWizardUI.setCreateButtonEnabled(all_checks);
    return all_checks;
  }

  static setProgressCardVisible(isVisible) {
    if (isVisible == true) {
      $("#new-server-wizard-drawer .main-form").addClass("hidden");
      $("#new-server-wizard-drawer #drawer-label").addClass("hidden");
      $(
        "#new-server-wizard-drawer button.text-gray-400.bg-transparent"
      ).addClass("hidden");
      $("#progress-card").removeClass("hidden");
    } else {
      $("#new-server-wizard-drawer .main-form").removeClass("hidden");
      $("#new-server-wizard-drawer #drawer-label").removeClass("hidden");
      $(
        "#new-server-wizard-drawer button.text-gray-400.bg-transparent"
      ).removeClass("hidden");
      $("#progress-card").addClass("hidden");
    }
    ServerWizardUI.validateInputs();
  }

  static setProgressCardHTML(html) {
    $("#progress-card").html(html);
  }
}
