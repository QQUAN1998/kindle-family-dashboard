const test = require("node:test");
const assert = require("node:assert/strict");
const { getAlmanacDays } = require("../shared/almanac");

test("uses the China calendar date across the UTC midnight boundary", () => {
  const days = getAlmanacDays(new Date("2026-09-22T16:30:00.000Z"));

  assert.deepEqual(days.map((day) => day.solar), ["9/23", "9/24"]);
  assert.deepEqual(days.map((day) => day.label), ["今天", "明天"]);
  assert.ok(days.every((day) => day.lunar.includes("月")));
  assert.ok(days.every((day) => day.good.length > 0));
});

test("accepts an explicit timezone when calendar previews need one", () => {
  const days = getAlmanacDays(new Date("2026-09-22T16:30:00.000Z"), "UTC");

  assert.equal(days[0].solar, "9/22");
});
