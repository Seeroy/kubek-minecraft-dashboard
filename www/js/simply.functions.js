function thisServerExists(sn) {
  r = false;
  $("#servers-list li").each(function () {
    if ($(this).find(".server-name").text() == sn) {
      r = true;
    }
  });
  return r;
}

function refreshSimplify() {
  if (typeof window.localStorage.simplify !== "undefined") {
    if (window.localStorage.simplify == "true") {
      $("html").addClass("simplify");
    } else {
      $("html").removeClass("simplify");
    }
  } else {
    window.localStorage.setItem("simplify", "false");
    $("html").removeClass("simplify");
  }
}

function refreshNoRounded() {
  if (typeof window.localStorage.norounded !== "undefined") {
    if (window.localStorage.norounded == "true") {
      $("html").addClass("norounded");
    } else {
      $("html").removeClass("norounded");
    }
  } else {
    window.localStorage.setItem("norounded", "false");
    $("html").removeClass("norounded");
  }
}

function refreshNoBackdrop() {
  if (typeof window.localStorage.nobackdrop !== "undefined") {
    if (window.localStorage.nobackdrop == "true") {
      $("html").addClass("nobackdrop");
    } else {
      $("html").removeClass("nobackdrop");
    }
  } else {
    window.localStorage.setItem("nobackdrop", "false");
    $("html").removeClass("nobackdrop");
  }
}

function refreshBackgroundImage() {
  if (typeof window.localStorage.background !== "undefined") {
    $("#blurry-bg-img-" + window.localStorage.background).show();
  } else {
    window.localStorage.setItem("background", "1");
    $("#blurry-bg-img-1").show();
  }
}

function refreshBlurRange() {
  if (typeof window.localStorage.blurrange !== "undefined") {
    $(".blurry-bg-img").each(function(){
      if($(this).css("display") == "none"){
        $(this).attr("style", "display: none; filter: blur(" + window.localStorage.blurrange + "px) !important;");
      } else {
        $(this).attr("style", "filter: blur(" + window.localStorage.blurrange + "px) !important;");
      }
    });
  } else {
    window.localStorage.setItem("blurrange", "24");
  }
}

function refreshFont() {
  if (typeof window.localStorage.fontfamily !== "undefined") {
    $("html").removeClass("inter sansserif segoeui consolas verdana")
    $("html").addClass(window.localStorage.fontfamily);
  } else {
    window.localStorage.setItem("fontfamily", "inter");
  }
}