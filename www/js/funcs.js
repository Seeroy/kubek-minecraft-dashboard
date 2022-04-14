/* Loader */
function showLoading(){
  $("#loading-overlay").addClass("d-flex");
  $("#loading-overlay").show();
}

function hideLoading(){
  $("#loading-overlay").removeClass("d-flex");
  $("#loading-overlay").hide();
}

function loadTemplate(cb){
  oldbody = $("#oldc").html();
  $.get("/template.inc.html", function (data) {
    $("body").html(data);
    $("#contentHere").html(oldbody);
    cb();
  });
}

function openSocket(){
  return io("ws://localhost:112");
}

