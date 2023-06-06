////////////////////////////////////
/////// Toaster.js by Seeroy ///////
/////////// Version: 1.0 ///////////
////////////////////////////////////

// Custom notifies function
function Toaster(
  html,
  duration,
  closeBtn = false,
  icon,
  callback = function () {},
  lowPriority = false
) {
  randId = "toast-" + Math.floor(Math.random() * (1000 - 10 + 1)) + 10;
  closeBtnHtml = "";
  lpBadge = "";
  timestamp = "";
  icon = getIconCode(icon);
  animName = getAnimationNameForToast();
  if (closeBtn == true) {
    closeBtnHtml =
      '<button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#' +
      randId +
      '" aria-label="Close"> <span class="sr-only">Close</span> <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg> </button>';
  }
  if (lowPriority == false || window.localStorage.nolowpriority == "false") {
    $("#toasts-list").prepend(
      '<div id="' +
        randId +
        '" style="max-width: 40vw;" class="animate__animated animate__' +
        animName +
        ' animate__faster flex items-center w-full max-w-xs p-4 space-x-4 bg-white divide-x divide-gray-200 rounded-lg shadow dark:divide-gray-700 space-x dark:bg-gray-900 mt-2 cursor-pointer select-none" role="alert">' +
        icon +
        "<div class='text-black dark:text-white px-3 select-none'>" +
        html +
        "</div>" +
        closeBtnHtml +
        "</div>"
    );
    $("#" + randId).click(function () {
      $(this).remove();
      callback();
    });
    if (duration > 0) {
      $("#" + randId)
        .delay(duration)
        .queue(function () {
          rid = "#" + $(this)[0].id;
          animateCSS(rid, "fadeOut", true);
        });
    }
  }
  now = new Date();

  timestamp =
    '<span class="bg-gray-100 text-gray-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded mr-2 dark:bg-gray-700 dark:text-gray-400 border border-gray-500"><i class="ri-time-line mr-2"></i>' +
    padU(now.getDate()) +
    "." +
    padU(now.getMonth() + 1) +
    " " +
    padU(now.getHours()) +
    ":" +
    padU(now.getMinutes()) +
    ":" +
    padU(now.getSeconds()) +
    "</span>";
  if (lowPriority == true) {
    lpBadge =
      '<span class="bg-gray-100 text-gray-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded mr-2 dark:bg-gray-700 dark:text-gray-400 border border-gray-500"><i class="ri-mail-star-line mr-2"></i>LOW PRIORITY</span>';
  }
  $("#toasts-history-list").prepend(
    '<div class="flex items-center w-full p-4 space-x-4 bg-white divide-x divide-gray-200 rounded-lg dark:divide-gray-700 space-x dark:bg-gray-900 max-w-full" role="alert">' +
      icon +
      "<div class='text-black dark:text-white px-3 select-none'>" +
      html +
      "</div>" +
      closeBtnHtml +
      "</div><div class='flex my-2 w-full'>" +
      timestamp +
      lpBadge +
      "</div>"
  );
  $("#notifications-badge").removeClass("hidden");
  $("#notifications-badge").text(
    parseInt($("#notifications-badge").text()) + 1
  );
}

function getAnimationNameForToast() {
  toastspos = window.localStorage.toastspos;
  switch (toastspos) {
    case "top-left":
      return "fadeInLeft";
    case "top-right":
      return "fadeInRight";
    case "bottom-left":
      return "fadeInLeft";
    case "bottom-right":
      return "fadeInRight";
    default:
      return "fadeIn";
  }
}

function getIconCode(icon) {
  if (icon == "success") {
    return '<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200"> <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> <span class="sr-only">Check icon</span> </div>';
  } else if (icon == "error") {
    return '<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200"> <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg> <span class="sr-only">Error icon</span> </div>';
  } else if (icon == "warning") {
    return '<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-orange-500 bg-orange-100 rounded-lg dark:bg-orange-700 dark:text-orange-200"> <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> <span class="sr-only">Warning icon</span> </div>';
  } else if (icon == "update") {
    return '<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-blue-500 bg-blue-100 rounded-lg dark:text-blue-300 dark:bg-blue-900"> <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path></svg> <span class="sr-only">Refresh icon</span> </div>';
  } else if (icon == "clock") {
    return '<div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-500 bg-gray-100 rounded-lg dark:text-gray-300 dark:bg-gray-700"><i class="ri-time-line"></i><span class="sr-only">Clock icon</span> </div>';
  } else {
    return icon;
  }
}
