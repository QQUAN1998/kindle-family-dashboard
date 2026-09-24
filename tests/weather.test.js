const test = require("node:test");
const assert = require("node:assert/strict");
const { searchLocations, fetchWeather } = require("../src/function/weather");

test("maps real geocoding fields needed to distinguish cities", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async (url) => {
    assert.equal(url.searchParams.get("name"), "海拉尔");
    assert.equal(url.searchParams.get("language"), "zh");
    return {
      ok: true,
      json: async () => ({ results: [{
        id: 2034439,
        name: "海拉尔",
        admin2: "呼伦贝尔市",
        admin1: "内蒙古",
        country: "中国",
        country_code: "CN",
        latitude: 41.57028,
        longitude: 120.45861,
        timezone: "Asia/Shanghai",
      }] }),
    };
  };

  const [location] = await searchLocations("海拉尔");
  assert.deepEqual(location, {
    id: 2034439,
    name: "海拉尔",
    admin2: "呼伦贝尔市",
    admin1: "内蒙古",
    country: "中国",
    countryCode: "CN",
    latitude: 41.57028,
    longitude: 120.45861,
    timezone: "Asia/Shanghai",
  });
});

test("requests and maps two local forecast days for selected coordinates", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async (url) => {
    assert.equal(url.searchParams.get("latitude"), "30.2741");
    assert.equal(url.searchParams.get("longitude"), "120.1551");
    assert.equal(url.searchParams.get("timezone"), "Asia/Shanghai");
    assert.equal(url.searchParams.get("forecast_days"), "2");
    return {
      ok: true,
      json: async () => ({ daily: {
        time: ["2026-09-22", "2026-09-23"],
        weather_code: [61, 3],
        temperature_2m_min: [23.1, 22.4],
        temperature_2m_max: [28.2, 29.3],
        precipitation_probability_max: [78, 42],
      } }),
    };
  };

  const weather = await fetchWeather({
    name: "杭州",
    latitude: 30.2741,
    longitude: 120.1551,
    timezone: "Asia/Shanghai",
  }, new Date("2026-09-22T01:28:00.000Z"));

  assert.equal(weather.locationName, "杭州");
  assert.deepEqual(weather.days, [
    { date: "2026-09-22", code: 61, min: 23.1, max: 28.2, rain: 78 },
    { date: "2026-09-23", code: 3, min: 22.4, max: 29.3, rain: 42 },
  ]);
});

test("retries a transient location provider failure", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("fetch failed");
    return { ok: true, json: async () => ({ results: [] }) };
  };

  await searchLocations("重试城市");
  assert.equal(attempts, 2);
});

test("returns a verified Guangzhou result when the external provider is unavailable", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => { throw new Error("fetch failed"); };

  const locations = await searchLocations("广州");

  assert.deepEqual(locations, [{
    id: "cn-guangzhou",
    name: "广州",
    admin2: "广州市",
    admin1: "广东",
    country: "中国",
    countryCode: "CN",
    latitude: 23.11667,
    longitude: 113.25,
    timezone: "Asia/Shanghai",
  }]);
});

test("resolves Chinese aliases for London, Tokyo, and New York to the intended cities", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ results: [{
      id: 1,
      name: "伦敦",
      admin2: "Middlesex County",
      admin1: "安大略",
      country: "加拿大",
      country_code: "CA",
      latitude: 42.98339,
      longitude: -81.23304,
      timezone: "America/Toronto",
    }] }),
  });

  const [london] = await searchLocations("伦敦");
  const [tokyo] = await searchLocations("东京");
  const [newYork] = await searchLocations("纽约");

  assert.equal(london.country, "英国");
  assert.equal(london.timezone, "Europe/London");
  assert.equal(tokyo.country, "日本");
  assert.equal(tokyo.timezone, "Asia/Tokyo");
  assert.equal(newYork.country, "美国");
  assert.equal(newYork.timezone, "America/New_York");
});
