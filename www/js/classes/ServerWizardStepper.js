const STEPPER_ACTIVE_CLASSES =
  "bg-green-200 dark:ring-gray-900 dark:bg-green-900";
const STEPPER_INACTIVE_CLASSES =
  "bg-gray-100 dark:ring-gray-900 dark:bg-gray-700";
const STEPPER_ACTIVE_CLASSES_TEXT = "text-white dark:text-black";
const STEPPER_INACTIVE_CLASSES_TEXT = "btext-gray-500";

const BEDROCK_STEPPER_DATA = [
  {
    title: "{{checking-be-ver-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-git-merge-fill'></i>",
    id: "checkingver",
    active: true,
  },
  {
    title: "{{downing-core-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-download-2-line'></i>",
    id: "downloading",
    active: false,
  },
  {
    title: "{{unpacking-core-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-inbox-unarchive-line'></i>",
    id: "unpacking",
    active: false,
  },
  {
    title: "{{completion-text-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-checkbox-circle-line'></i>",
    id: "completion",
    active: false,
  },
];

const JAVA_BASE_STEPPER_DATA = [
  {
    title: "{{checking-core-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-git-merge-fill'></i>",
    id: "searchingcore",
    active: true,
  },
  {
    title: "{{completion-text-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-checkbox-circle-line'></i>",
    id: "completion",
    active: false,
  },
];

const JAVA_STEPPER_BLOCKS = {
  checking: {
    title: "{{checking-core-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-git-merge-fill'></i>",
    id: "checking",
    active: false,
  },
  "downloading-core": {
    title: "{{downing-core-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-download-2-line'></i>",
    id: "downloading-core",
    active: false,
  },
  "downloading-java": {
    title: "{{downing-core-sw}} Java",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-download-2-line'></i>",
    id: "downloading-java",
    active: false,
  },
  "unpacking-java": {
    title: "{{unpacking-core-sw}} Java",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-inbox-unarchive-line'></i>",
    id: "unpacking-java",
    active: false,
  },
  "installing-forge": {
    title: "{{forge-ins-text-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-install-fill'></i>",
    id: "installing-forge",
    active: false,
  },
  completion: {
    title: "{{completion-text-sw}}",
    description: "{{plswait-sw}}",
    icon: "<i class='ri-checkbox-circle-line'></i>",
    id: "completion",
    active: false,
  },
};

// STEPPER CONTROLS CLASS

class ServerWizardStepper {
  static generateStepper(items) {
    var htmlCode =
      '<ol class="relative text-gray-500 border-l border-gray-200 dark:border-gray-700 dark:text-gray-400">';
    items.forEach(function (item) {
      var classList =
        "absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-4 ring-white";
      var classList_text = "";
      if (item.active == true) {
        classList += STEPPER_ACTIVE_CLASSES;
        classList_text = STEPPER_ACTIVE_CLASSES_TEXT;
      } else {
        classList += STEPPER_INACTIVE_CLASSES;
        classList_text = STEPPER_INACTIVE_CLASSES_TEXT;
      }
      htmlCode +=
        '<li class="mb-10 ml-6" id="stepperitem-' +
        item.id +
        '"> <span class="' +
        classList +
        " " +
        classList_text +
        '">' +
        item.icon +
        '</span> <h3 class="font-medium leading-tight font-semibold ' +
        classList_text +
        '">' +
        item.title +
        '</h3> <p class="text-sm ' +
        classList_text +
        '">' +
        item.description +
        "</p> </li>";
    });
    htmlCode += "</ol>";
    return htmlCode;
  }

  static setActiveItemByID(id, isActive) {
    if (isActive == true) {
      $("#stepperitem-" + id + " span").removeClass(STEPPER_INACTIVE_CLASSES);
      $("#stepperitem-" + id + " span").addClass(STEPPER_ACTIVE_CLASSES);
      $(
        "#stepperitem-" + id + " h3, " + "#stepperitem-" + id + " p"
      ).removeClass(STEPPER_INACTIVE_CLASSES_TEXT);
      $("#stepperitem-" + id + " h3, " + "#stepperitem-" + id + " p").addClass(
        STEPPER_ACTIVE_CLASSES_TEXT
      );
    } else {
      $("#stepperitem-" + id + " span").removeClass(STEPPER_ACTIVE_CLASSES);
      $("#stepperitem-" + id + " span").addClass(STEPPER_INACTIVE_CLASSES);
      $(
        "#stepperitem-" + id + " h3, " + "#stepperitem-" + id + " p"
      ).removeClass(STEPPER_ACTIVE_CLASSES_TEXT);
      $("#stepperitem-" + id + " h3, " + "#stepperitem-" + id + " p").addClass(
        STEPPER_INACTIVE_CLASSES_TEXT
      );
    }
  }

  static isItemActive(id) {
    return $("#stepperitem-" + id + " span").hasClass(STEPPER_ACTIVE_CLASSES);
  }

  static markAsCompletedByID(id) {
    $("#stepperitem-" + id + " span").removeClass(STEPPER_INACTIVE_CLASSES);
    $("#stepperitem-" + id + " span").addClass(STEPPER_ACTIVE_CLASSES);
    $("#stepperitem-" + id + " h3, " + "#stepperitem-" + id + " p").removeClass(
      STEPPER_ACTIVE_CLASSES_TEXT
    );
    $("#stepperitem-" + id + " h3, " + "#stepperitem-" + id + " p").addClass(
      STEPPER_INACTIVE_CLASSES_TEXT
    );
    $("#stepperitem-" + id + " p").text("{{success}}!");
    ServerWizardStepper.setItemIconByID(
      id,
      '<i class="ri-check-line text-green-600"></i>'
    );
  }

  static setItemIconByID(id, icon) {
    $("#stepperitem-" + id + " span").html(icon);
  }

  static setItemTitleByID(id, title) {
    $("#stepperitem-" + id + " h3").text(title);
  }

  static setItemDescriptionByID(id, desc) {
    $("#stepperitem-" + id + " p").html(desc);
  }
}