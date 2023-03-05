const dateHelper = dateHelperFactory();
const formatDateFactory = date => {
  const vals = `dd,mm,yyyy,hh,mmi,ss`.split(`,`);
  const myDate = dateHelper(date).toArr(...vals);
  return `${myDate.slice(0, 3).join(`/`)} ${
    myDate.slice(3, 6).join(`:`)}`;
};

function dateHelperFactory() {
  const padZero = (val, len = 2) => `${val}`.padStart(len, `0`);
  const setValues = date => {
    let vals = {
      d: date.getDate(),
      m: date.getMonth() + 1,
      yyyy: date.getFullYear(),
      h: date.getHours(),
      mi: date.getMinutes(),
      s: date.getSeconds(),
    };
    Object.keys(vals).filter(k => k !== `yyyy`).forEach(k =>
      vals[k[0] + k] = padZero(vals[k], k === `ms` && 3 || 2));
    return vals;
  };

  return date => ({
    values: setValues(date),
    toArr(...items) {
      return items.map(i => this.values[i]);
    },
  });
}