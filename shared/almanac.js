const { Solar } = require("lunar-javascript");

const ALMANAC_TIMEZONE = "Asia/Shanghai";

function getDateParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function getAlmanacDays(now = new Date(), timeZone = ALMANAC_TIMEZONE) {
  const parts = getDateParts(now, timeZone);
  const baseDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return [0, 1].map((offset) => {
    const date = new Date(baseDate);
    date.setUTCDate(date.getUTCDate() + offset);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const solar = Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();
    return {
      label: offset === 0 ? "今天" : "明天",
      solar: `${month}/${day}`,
      lunar: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      good: lunar.getDayYi().slice(0, 5),
    };
  });
}

module.exports = { ALMANAC_TIMEZONE, getAlmanacDays };
