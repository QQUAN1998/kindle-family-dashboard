const fs = require("node:fs");
const path = require("node:path");

const apiBase = process.argv[2]?.replace(/\/$/, "");
const pin1 = process.env.KD_PIN1;
const pin2 = process.env.KD_PIN2;
const secrets = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "work", "deployment-secrets.json"), "utf8"));

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${new URL(url).pathname}: ${body.error || response.status}`);
  return body;
}

async function login(pin) {
  return jsonRequest(`${apiBase}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: pin }),
  });
}

async function main() {
  const first = await login(pin1);
  const second = await login(pin2);
  const state = await jsonRequest(`${apiBase}/state`, { headers: { authorization: `Bearer ${first.token}` } });
  const cityChecks = [
    ["广州", "广州", "中国"], ["上海", "上海", "中国"], ["深圳", "深圳", "中国"],
    ["成都", "成都", "中国"], ["西安", "西安", "中国"], ["杭州", "杭州", "中国"],
    ["北京", "北京", "中国"], ["伦敦", "伦敦", "英国"], ["东京", "东京", "日本"],
    ["纽约", "纽约", "美国"],
  ];
  const verifiedCities = [];
  for (const [query, expectedName, expectedCountry] of cityChecks) {
    const locations = await jsonRequest(`${apiBase}/locations?q=${encodeURIComponent(query)}`, {
      headers: { authorization: `Bearer ${second.token}` },
    });
    const city = locations.results?.find((item) => item.name === expectedName && item.country === expectedCountry);
    if (!city || !Number.isFinite(city.latitude) || !Number.isFinite(city.longitude) || !city.timezone) {
      throw new Error(`Location search did not resolve ${query} to ${expectedName}, ${expectedCountry}`);
    }
    verifiedCities.push(`${query}:${city.country}`);
  }
  const chaoyang = await jsonRequest(`${apiBase}/locations?q=${encodeURIComponent("朝阳")}`, {
    headers: { authorization: `Bearer ${second.token}` },
  });
  if (chaoyang.results?.length !== 2) throw new Error("Ambiguous Chaoyang search should return two explicit choices");
  if (!Array.isArray(state.almanac) || state.almanac.length !== 2 || state.almanac.some((day) => !day.solar || !day.lunar || !day.good?.length)) {
    throw new Error("State response did not include two complete almanac days");
  }
  const snapshot = await jsonRequest(`${apiBase}/kindle/snapshot?device=${encodeURIComponent(secrets.deviceToken)}`);
  const imageResponse = await fetch(snapshot.url);
  if (!imageResponse.ok) throw new Error(`Snapshot download failed with ${imageResponse.status}`);
  const png = Buffer.from(await imageResponse.arrayBuffer());
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Snapshot is not PNG");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  fs.writeFileSync(path.resolve(__dirname, "..", "work", "cloud-snapshot.png"), png);
  console.log(JSON.stringify({
    health: true,
    users: [first.user.label, second.user.label],
    familyName: state.state.familyName,
    countdowns: state.state.countdowns.length,
    weatherDays: state.weather?.days?.length || 0,
    almanacDays: state.almanac.length,
    selectedLocation: `${state.state.location.name} / ${state.weather?.locationName || "no weather"}`,
    verifiedCities,
    ambiguousChaoyangChoices: chaoyang.results.map((item) => `${item.name}:${item.admin1}`),
    snapshot: `${width}x${height}`,
    snapshotBytes: png.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
