var trackingDownloads = {};
var snameRegex = /^[a-zA-Z0-9_.-]*$/gm;
var selectedGameType = "java";
var serverName,
  onlineMode,
  port,
  coreType,
  javaEnabled,
  forgeEnabled,
  gameVersion,
  coreFileName,
  startLine;

  $(document).ready(function () {
    ServerWizardUI.setDefaultValues();
    ServerWizardUI.setupBinds();
  });
  
  /* OTHER USEFUL FUNCTIONS */
  function arr_diff(a1, a2) {
    var a = [],
      diff = [];
    for (var i = 0; i < a1.length; i++) {
      a[a1[i]] = true;
    }
    for (var i = 0; i < a2.length; i++) {
      if (a[a2[i]]) {
        delete a[a2[i]];
      } else {
        a[a2[i]] = true;
      }
    }
    for (var k in a) {
      diff.push(k);
    }
    return diff;
  }
  
  function round512(x) {
    return Math.ceil(x / 512) * 512;
  }
  
  function detectServerVersion(name) {
    return name.match(/-1\.\d{1,2}(\.\d{1,2})?/gm);
  }
  
  function invertBoolean(value) {
    return (value == true) ? false : true;
  }