const test = require("node:test");
const assert = require("node:assert/strict");
const { getSearchOutcome, uniqueLocations } = require("../site/location-picker");

const GUANGZHOU = {
  id: "cn-guangzhou",
  name: "广州",
  admin2: "广州市",
  admin1: "广东",
  country: "中国",
  latitude: 23.11667,
  longitude: 113.25,
  timezone: "Asia/Shanghai",
};

test("manual city search always asks the user to select a candidate", () => {
  assert.deepEqual(getSearchOutcome([GUANGZHOU], { quickPick: false }), {
    kind: "choices",
    locations: [GUANGZHOU],
  });
});

test("a popular-city quick pick selects its single verified result", () => {
  assert.deepEqual(getSearchOutcome([GUANGZHOU], { quickPick: true }), {
    kind: "select",
    location: GUANGZHOU,
  });
});

test("duplicate provider locations are collapsed by coordinates", () => {
  assert.deepEqual(uniqueLocations([GUANGZHOU, { ...GUANGZHOU, id: "duplicate" }]), [GUANGZHOU]);
});
