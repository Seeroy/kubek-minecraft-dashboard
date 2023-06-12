function thisServerExists(sn) {
  r = false;
  $("#servers-list-drawer .content div.bg-gray-300").each(function () {
    if ($(this).find(".grow").text() == sn) {
      r = true;
    }
  });
  return r;
}

function formatUptime(seconds) {
  var hours = Math.floor(seconds / (60 * 60));
  var minutes = Math.floor((seconds % (60 * 60)) / 60);
  var seconds = Math.floor(seconds % 60);

  return padU(hours) + "h" + padU(minutes) + "m" + padU(seconds) + "s";
}

function padU(s) {
  return (s < 10 ? "0" : "") + s;
}

const animateCSS = (element, animation, removeAfterAnimation = false, prefix = "animate__") =>
  new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);

    node.classList.add(`${prefix}animated`, animationName, `${prefix}faster`);

    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(
        `${prefix}animated`,
        animationName,
        `${prefix}faster`
      );
      if(removeAfterAnimation == true){
        node.remove();
      }
      resolve("Animation ended");
    }

    node.addEventListener("animationend", handleAnimationEnd, {
      once: true,
    });
  });

function convertFileSizeToHuman(size) {
  if (size < 1024) {
    size = size + " B";
  } else if (size < 1024 * 1024) {
    size = Math.round((size / 1024) * 10) / 10 + " Kb";
  } else if (size >= 1024 * 1024 && size < 1024 * 1024 * 1024) {
    size = Math.round((size / 1024 / 1024) * 10) / 10 + " Mb";
  } else if (size >= 1024 * 1024 * 1024) {
    size = Math.round((size / 1024 / 1024 / 1024) * 10) / 10 + " Gb";
  } else {
    size = size + " ?";
  }
  return size;
}

function linkify(inputText) {
  var replacedText, replacePattern1, replacePattern2, replacePattern3;

  //URLs starting with http://, https://, or ftp://
  replacePattern1 =
    /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
  replacedText = inputText.replace(
    replacePattern1,
    '<a href="$1" target="_blank">$1</a>'
  );

  //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
  replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  replacedText = replacedText.replace(
    replacePattern2,
    '$1<a href="http://$2" target="_blank">$2</a>'
  );

  //Change email addresses to mailto:: links.
  replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
  replacedText = replacedText.replace(
    replacePattern3,
    '<a href="mailto:$1">$1</a>'
  );

  return replacedText;
}