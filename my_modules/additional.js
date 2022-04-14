exports.getTimeFormatted = () => {
  date = new Date();
  return "[" + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0") + ":" + date.getSeconds().toString().padStart(2, "0") + "." + date.getMilliseconds().toString().padStart(2, "0") + "]";
}