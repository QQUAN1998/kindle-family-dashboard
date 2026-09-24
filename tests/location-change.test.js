const test = require("node:test");
const assert = require("node:assert/strict");
const { hasLocationChanged } = require("../src/function/location");

test("detects coordinates that require an immediate weather refresh", () => {
  const hangzhou = { latitude: 30.29365, longitude: 120.16142, timezone: "Asia/Shanghai" };
  const guangzhou = { latitude: 23.11667, longitude: 113.25, timezone: "Asia/Shanghai" };

  assert.equal(hasLocationChanged(hangzhou, guangzhou), true);
  assert.equal(hasLocationChanged(hangzhou, { ...hangzhou, name: "杭州市" }), false);
});
