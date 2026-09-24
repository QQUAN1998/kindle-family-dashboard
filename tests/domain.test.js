const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cleanupCountdowns,
  normalizeState,
  visibleCountdowns,
} = require("../shared/domain");

const NOW = new Date("2026-09-22T12:00:00+08:00");

test("normalizes the complete shared dashboard contract", () => {
  const state = normalizeState({
    familyName: "示例家庭",
    location: { name: "杭州", admin2: "杭州市", admin1: "浙江", country: "中国", countryCode: "CN", latitude: 30.27, longitude: 120.15, timezone: "Asia/Shanghai" },
    blackboard: { content: "周六三点出发", publishedAt: "2026-09-22T03:00:00.000Z" },
    countdowns: [{ id: "trip", category: "旅游", title: "周末出行", date: "2026-10-10" }],
    brightness: { enabled: true, dayStart: "07:00", nightStart: "18:30", day: 1, night: 10 },
  }, NOW);

  assert.equal(state.familyName, "示例家庭");
  assert.equal(state.location.admin1, "浙江");
  assert.equal(state.location.country, "中国");
  assert.equal(state.countdowns.length, 1);
  assert.equal(state.brightness.night, 10);
});

test("rejects more than six countdowns and overlong custom categories", () => {
  const base = {
    familyName: "家",
    location: { name: "杭州", latitude: 30.27, longitude: 120.15, timezone: "Asia/Shanghai" },
    blackboard: { content: "出发", publishedAt: NOW.toISOString() },
    brightness: { enabled: true, dayStart: "07:00", nightStart: "18:30", day: 1, night: 10 },
  };
  assert.throws(() => normalizeState({ ...base, countdowns: Array.from({ length: 7 }, (_, i) => ({
    id: `id-${i}`, category: "生日", title: `事项${i}`, date: "2026-10-10",
  })) }, NOW), /最多 6 个/);
  assert.throws(() => normalizeState({ ...base, countdowns: [{
    id: "x", category: "超过十个字符的自定义分类名称", title: "事项", date: "2026-10-10",
  }] }, NOW), /类目/);
});

test("hides a countdown one day after due and deletes it three days after due", () => {
  const items = [
    { id: "today", category: "工作DDL", title: "今天", date: "2026-09-22" },
    { id: "one", category: "工作DDL", title: "昨天", date: "2026-09-21" },
    { id: "two", category: "工作DDL", title: "前天", date: "2026-09-20" },
    { id: "three", category: "工作DDL", title: "三天前", date: "2026-09-19" },
  ];
  assert.deepEqual(visibleCountdowns(items, NOW).map((item) => item.id), ["today", "one"]);
  assert.deepEqual(cleanupCountdowns(items, NOW).map((item) => item.id), ["today", "one", "two"]);
});
