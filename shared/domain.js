const PRESET_CATEGORIES = ["生日", "演唱会", "旅游", "纪念日", "工作DDL", "抢票"];

function text(value, name, max, { required = true } = {}) {
  const normalized = String(value ?? "").trim();
  const length = Array.from(normalized).length;
  if (required && length === 0) throw new Error(`${name}不能为空`);
  if (length > max) throw new Error(`${name}最多 ${max} 个字符`);
  return normalized;
}

function isoDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error(`${name}日期格式无效`);
  const date = new Date(`${value}T12:00:00+08:00`);
  if (Number.isNaN(date.valueOf())) throw new Error(`${name}日期无效`);
  return String(value);
}

function isoTimestamp(value, fallback) {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.valueOf())) throw new Error("发布日期无效");
  return date.toISOString();
}

function time(value, name) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value))) throw new Error(`${name}时间无效`);
  return String(value);
}

function countDays(dateString, now = new Date()) {
  const target = new Date(`${dateString}T12:00:00+08:00`);
  const current = new Date(now);
  current.setHours(12, 0, 0, 0);
  return Math.round((target.valueOf() - current.valueOf()) / 86_400_000);
}

function cleanupCountdowns(items, now = new Date()) {
  return items.filter((item) => countDays(item.date, now) > -3);
}

function visibleCountdowns(items, now = new Date()) {
  return cleanupCountdowns(items, now).filter((item) => countDays(item.date, now) >= -1);
}

function normalizeState(input, now = new Date()) {
  if (!input || typeof input !== "object") throw new Error("看板数据无效");
  const countdownInput = Array.isArray(input.countdowns) ? input.countdowns : [];
  if (countdownInput.length > 6) throw new Error("倒计时最多 6 个");
  const countdowns = countdownInput.map((item, index) => ({
    id: text(item.id || `countdown-${index + 1}`, "倒计时 ID", 64),
    category: text(item.category, "倒计时类目", 10),
    title: text(item.title, "倒计时名称", 20),
    date: isoDate(item.date, "倒计时"),
  }));
  const latitude = Number(input.location?.latitude);
  const longitude = Number(input.location?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("纬度无效");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("经度无效");
  const day = Number(input.brightness?.day);
  const night = Number(input.brightness?.night);
  if (!Number.isInteger(day) || day < 0 || day > 24 || !Number.isInteger(night) || night < 0 || night > 24) {
    throw new Error("亮度需为 0 到 24 的整数");
  }
  return {
    familyName: text(input.familyName, "家庭名称", 15),
    location: {
      name: text(input.location?.name, "城市", 24),
      admin2: text(input.location?.admin2, "城市行政区", 40, { required: false }),
      admin1: text(input.location?.admin1, "城市省份", 40, { required: false }),
      country: text(input.location?.country, "城市国家", 40, { required: false }),
      countryCode: text(input.location?.countryCode, "城市国家代码", 3, { required: false }),
      latitude,
      longitude,
      timezone: text(input.location?.timezone || "Asia/Shanghai", "时区", 64),
    },
    blackboard: {
      content: text(input.blackboard?.content, "小黑板内容", 40),
      publishedAt: isoTimestamp(input.blackboard?.publishedAt, now),
    },
    countdowns: cleanupCountdowns(countdowns, now),
    brightness: {
      enabled: Boolean(input.brightness?.enabled),
      dayStart: time(input.brightness?.dayStart, "白天开始"),
      nightStart: time(input.brightness?.nightStart, "夜间开始"),
      day,
      night,
    },
  };
}

module.exports = { PRESET_CATEGORIES, countDays, cleanupCountdowns, visibleCountdowns, normalizeState };
